/////////////////////////////////////////////////////////////////////////////
// qcengine_reg.js
// Copyright 2000-2011 Eric Johnston
// qcengine@machinelevel.com
//
//  License:
//    (This is similar to the zlib license, with item 4 added and modifications
//     which apply only to commercial use.) 
//
//  This software is provided 'as-is', without any express or implied
//  warranty. In no event will the authors be held liable for any damages
//  arising from the use of this software.
//
//  Commercial use requires written authorization from the author.
//  Please contact me, as I can also help make sure you're getting the best use
//  from this software, and have the most up-to-date version.
//
//  Permission is granted to anyone to use this software for non-commercial
//  purposes, and to alter it and redistribute it freely, subject to the
//  following restrictions:
//
//  1. The origin of this software must not be misrepresented; you must not
//     claim that you wrote the original software. If you use this software
//     in a product, an acknowledgment in the product documentation would be
//     appreciated but is not required.
//  2. Altered source versions must be plainly marked as such, and must not be
//     misrepresented as being the original software.
//  3. This notice may not be removed or altered from any source distribution.
//  4. If you find this material useful, I'd love to know. If there is an email
//     address listed above this notice, please consider sending me a note.
//  (end of license text)
//
//  Commercial interest: There are several versions of this software, each
//  designed to maximize speed under different hardware and/or language constraints.
//  For more info, please contact me at qcengine@machinelevel.com
//


///////////////////////////////////////////////////////////////
// Major tasks in process: (all are started, none are finished)
//      1. Deferred block jobs
// DONE 2. Script window
// DONE 3. Animation for circles window
//      4. GPU block job
// DONE 5. Finish circles window
//      6. Allow all ops in staff window
// DONE 7. Dim staff lines where not in use
//      8. Enable animation for staff scripts
//      9. Print timing of staff scripts


/////////////////////////////////////////////////////////////////////////////
// The QReg class simulates qubit registers for a quantum computer.
//   numQubits       is the number of qubits to simulate (any positive integer)
//   doublePrecision is a bool which determines whether we use single or double floats
//
// Some key methods:
//   activate()      will allocate the qubit data and ready it for computation.
//
//   deactivate()    will free the qubit data memory when you're done. You can
//                   call activate() again if you like, but the previous data is lost.
//
//   bytesRequired() determines how much memory the qubit data will take. This may be
//                   called on an active or inactive QReg.
//
// BIG FAT WARNING: After creating a QReg, be sure to call bytesRequired() to see
//                  how much memory is going to be required to activate the
//                  register. You might be surprised. Here are some examples:
//
//                     1-qubit single precision: (2^1) *4*2 = 16 bytes
//                    10-qubit single precision: (2^10)*4*2 = 8 KB
//                    20-qubit single precision: (2^20)*4*2 = 8 MB
//                    32-qubit single precision: (2^32)*4*2 = 32 GB
//                    64-qubit single precision: (2^64)*4*2 = 128 exabytes
//                                   (one exabyte = about a million million MB)
//
//                  At 164 qubits, the number of bytes required exceeds the number of
//                  atoms in the Earth. Please let me know if you get this working.
//
//                  Note that even if your machine can handle the data size, some computations
//                  may take longer than the estimated remaining life of the universe.
//

var printSpeedMetrics = false;
var enableMonolithicArray = false;
var fullDebugChecking = false;
var enableGPUBlocks = false;

function QBlock(numQubits, qReg)
{
    this.qReg = qReg;
    this.numQubits = numQubits; // effective number of qubits if this were standalone
    this.bitValue = 1 << (numQubits - 1);   // value of the bit this node represents
    this.kidMask = this.bitValue - 1;       // Mask conditions etc when passing downstream
    this.values = null;
    this.allZero = false; // All values are known to be zero
    this.most_recent_ppm_result = 0;

    if (!qReg.noCPUBlocks)
    {
      // Using typed arrays helps with speed.
      if (qReg.masterArray)
      {
          this.masterArrayStartIndex = qReg.masterNextIndex;
          qReg.masterNextIndex += 2 * qReg.numBlockValues;
          this.values = qReg.masterArray.subarray(this.masterArrayStartIndex, qReg.masterNextIndex);
      }
    	else if (qReg.doublePrecision)
  	      this.values = new Float64Array(new ArrayBuffer(qReg.bytesPerBlock)); // the real component
  	  else
  	      this.values = new Float32Array(new ArrayBuffer(qReg.bytesPerBlock)); // the real component
    }
    // GPU block
    this.gpuBlock = null;
    if (enableGPUBlocks && webgl_blocks.ready)
      this.gpuBlock = webgl_blocks.allocateNewBlock();

    ////////////////////////////
   	// methods
	this.setZero = function ()
	{
        if (this.gpuBlock)
        {
            this.gpuBlock.op_clear(0.0);
            if (!webgl_blocks.side_by_side_checking)
                return;
        }
        if (this.qReg.core_sim)
          return;
        var numValues = 1 << this.numQubits;
        numValues *= 2; // re/im
        for (var i = 0; i < numValues; ++i)
        {
            this.values[i] = 0.0;
        }
        if (this.gpuBlock && webgl_blocks.side_by_side_checking)
            this.gpuBlock.side_by_side_check('setZero', this.values);
    }
	this.scaleValues = function (scale)
	{
        if (this.gpuBlock)
        {
            this.gpuBlock.op_scale(scale);
            if (!webgl_blocks.side_by_side_checking)
                return;
        }
        var numValues = 1 << this.numQubits;
        numValues *= 2; // re/im
        for (var i = 0; i < numValues; ++i)
        {
            this.values[i] *= scale;
        }
        if (this.gpuBlock && webgl_blocks.side_by_side_checking)
            this.gpuBlock.side_by_side_check('scaleValues', this.values);
    }

	this.initialize = function (value)
	{
      if (this.gpuBlock)
      {
          // TODO: There's a faster way to do this besides a clear and a bunch of not ops.
          //       But I don't think we ever initialize to non-zero values.
          this.gpuBlock.op_clear(1.0);
          for (var i = 0; i < this.numQubits; ++i)
          {
            var mask = 1 << i;
            if (value & mask)
              this.gpuBlock.op_not(mask);
          }
          if (!webgl_blocks.side_by_side_checking)
            return;
      }
      if (this.qReg.core_sim)
        return;
      var numValues = 1 << this.numQubits;
      numValues *= 2; // re/im
      for (var i = 0; i < numValues; ++i)
      {
          this.values[i] = 0.0;
      }
      this.values[value * 2] = 1.0;
      if (this.gpuBlock && webgl_blocks.side_by_side_checking)
          this.gpuBlock.side_by_side_check('initialize', this.values);
    }

	  this.destruct = function ()
	  {
        // Help the garbage collector out by unhooking everything.
      if (this.gpuBlock)
      {
          this.gpuBlock.destruct();
          this.gpuBlock = null;
      }
      if (this.qReg.core_sim)
        return;
      delete this.values;
      this.values = null;
    }
}

function QRegNode(numQubits, qReg)
{
    this.numQubits = numQubits; // effective number of qubits if this were standalone
    this.bitValue = 1 << (numQubits - 1);   // value of the bit this node represents
    this.kidMask = this.bitValue - 1;       // Mask conditions etc when passing downstream

    this.tree = new Array();
    if (numQubits - 1 <= qReg.numBlockQubits)
    {
        // If we're at our block size, just allocate the buffers.
        this.tree[0] = new QBlock(numQubits - 1, qReg);
        this.tree[1] = new QBlock(numQubits - 1, qReg);
    }
    else
    {
        // Otherwise, keep building the tree.
        this.tree[0] = new QRegNode(numQubits - 1, qReg);
        this.tree[1] = new QRegNode(numQubits - 1, qReg);
    }

    ////////////////////////////
   	// methods
	this.setZero = function ()
	{
        this.tree[0].setZero();
        this.tree[1].setZero();
    }
	this.scaleValues = function (scale)
	{
        this.tree[0].scaleValues(scale);
        this.tree[1].scaleValues(scale);
    }
	this.initialize = function (value)
	{
        // standard useful prep
        var target = value >> (this.numQubits - 1);

        this.tree[    target].initialize(value & this.kidMask);
        this.tree[1 - target].setZero();
    }

	this.destruct = function ()
	{
        // Help the garbage collector out by unhooking everything.
        this.tree[0].destruct();
        this.tree[1].destruct();
        delete this.tree[0];
        delete this.tree[1];
        delete this.tree;
        this.tree = null;
    }

	this.swap = function ()
	{
        var temp = this.tree[0];
        this.tree[0] = this.tree[1];
        this.tree[1] = temp;
    }
}

// QNullBlock
// This data type is a fallback to digital simulation.
// It's just like reading all bits after each operation.
// So many things work, but no superposition is stored, so there are no quantum effects.
// Still, it's useful for testing ccnot-based logic.
function QNullBlock(numQubits, qReg)
{
    this.qReg = qReg;
    this.numQubits = numQubits; // effective number of qubits if this were standalone
    this.bitValue = 1 << (numQubits - 1);   // value of the bit this node represents
    this.kidMask = this.bitValue - 1;       // Mask conditions etc when passing downstream

    this.values = bitfield_zero;

    ////////////////////////////
    // methods
  this.setZero = function ()
  {
    this.values = bitfield_zero;
  }
  this.scaleValues = function (scale) {}
  this.initialize = function (value)
  {
    this.values = to_bitfield(value);
  }

  this.read = function (targetQubits)
  {
    targetQubits = to_bitfield(targetQubits);
    return this.values & targetQubits;
  }

  this.destruct = function () {}

  this.not = function (targetQubit)
  {
    targetQubit = to_bitfield(targetQubit);
    this.values ^= targetQubit;
  }

  this.cnot = function (targetQubit, conditionQubits, pairBranch)
  {
    targetQubit = to_bitfield(targetQubit);
    conditionQubits = to_bitfield(conditionQubits);
    if ((this.values & conditionQubits) == conditionQubits)
      this.not(targetQubit);
  }

  this._phaseShift = function (conditionQubits, sval, cval) {}
  this.op2x2 = function (targetQubit, opFunc, opData, pairBranch) {}
  this.cop2x2 = function (targetQubit, conditionQubits, opFunc, opData, pairBranch)
  {
    targetQubit = to_bitfield(targetQubit);
    conditionQubits = to_bitfield(conditionQubits);
    if ((this.values & conditionQubits) == conditionQubits)
      this.op2x2(targetQubit, opFunc, opData, pairBranch);
  }

  this.setZeroMask = function (targetQubits, targetValues) {}
  this.totalLengthSquared = function () {return 1;}
  this.peekQubitProbability = function (targetQubit)
  {
    targetQubit = to_bitfield(targetQubit);
    if ((this.values & targetQubit) == targetQubit)
      return 1;
    return 0;
  }

  this.peekComplexValue = function (targetValue)
  {
    targetValue = to_bitfield(targetValue);
    if (this.values == targetValue)
      return new Vec2(1, 0);
    return new Vec2(0, 0);
  }

  this.pokeComplexValue = function (targetValue, x, y)
  {
    targetValue = to_bitfield(targetValue);
    var threshold = 0.5 * 0.5;
    var prob = x * x + y * y;
    if (prob >= threshold)
      this.values = targetValue;
  }
}

function human_data_size(bytes)
{
  var kilo = 1024;
  var mega = 1024 * 1024;
  var giga = 1024 * 1024 * 1024;
  if (bytes >= giga)
    return '' + (bytes / giga).toFixed(0) + ' GiB';
  if (bytes >= mega)
    return '' + (bytes / mega).toFixed(0) + ' MiB';
  if (bytes >= kilo)
    return '' + (bytes / kilo).toFixed(0) + 'k';
  else
    return '' + bytes + ' bytes';
}

function QReg(numQubits, numBlockQubits, doublePrecision)
{
    // Note: it's valid for numQubits to be smaller than numBlockQubits,
    // to allow for future expansion.

    this.animateWidgets = true;
    this.blockCanvas = null;
    this.blockCtx = null;
    this.glBlocks = null;
    this.noCPUBlocks = false;
    this.mbc = null;
    this.chp = null;
    this.mixed_states = null;
    this.current_mix = null;
    this.core_sim = null;


    ////////////////////////////
   	// methods

    this.setSize = function(numQubits, numBlockQubits, doublePrecision)
    {
      setup_bitfields(numQubits);
      this.classicalBits = bitfield_zero;
      this.classicalBitsValid = bitfield_zero;

      if (numBlockQubits == null)
        numBlockQubits = numQubits;
     if (doublePrecision == null)
        doublePrecision = false;

      this.deactivate();

	    this.numQubits = numQubits;    // total number of qubits
      this.numValues = 1 << this.numQubits;
      this.allBitsMask = (bitfield_one << to_bitfield(this.numQubits)) - bitfield_one;

	    this.numBlockQubits = numBlockQubits;    // number of qubits per data block
      this.numBlockValues = 1 << this.numBlockQubits;

	    this.doublePrecision = doublePrecision;
	    if (this.doublePrecision)
	        this.bytesPerFloat = 8;
	    else
	        this.bytesPerFloat = 4;

      this.bytesPerBlock = this.numBlockValues * this.bytesPerFloat * 2; // *2 is for real/imag
      this.numBlocks = 1 << (numQubits - numBlockQubits);

	    this.reservedBits = new Array(this.numQubits);    // this array tracks which bits are in use
	    for (var i = 0; i < this.numQubits; ++i)
	        this.reservedBits[i] = false;
	    this.reservedBitsHighWater = 0;        // any bits above this are unused, so we can save time
    }

	this.activate = function ()
	{
      this.masterArray = null;
      this.masterNextIndex = 0;
      this.blockNotAsm = null;
      this.noCPUBlocks = false;
      this.photonSim = null;
      this.use_photon_sim = false;
      this.mixed_states = null;
      this.current_mix = null;
      this.did_use_photonic_sim = false;
      this.noise_mask = bitfield_zero;
      this.noise_level = new Array(this.numQubits);

      if (this.core_sim)
      {
        this.noCPUBlocks = true;
        this.core_sim.qreg_activated();
      }

      if (enableGPUBlocks)
      {
        webgl_blocks.initialize(this);
        if (!webgl_blocks.side_by_side_checking)  // Don't need CPU blocks if we're all GPU
          this.noCPUBlocks = true;
      }

      if (enableMonolithicArray && !this.noCPUBlocks)
      {
          if (qReg.doublePrecision)
              this.masterArray = new Float64Array(new ArrayBuffer(qReg.bytesPerBlock * this.numBlocks)); // the real component
          else
              this.masterArray = new Float32Array(new ArrayBuffer(qReg.bytesPerBlock * this.numBlocks)); // the real component
           this.blockNotAsm = BlockAsmModule({ Math: Math }, null, this.masterArray).not;
      }

	    if (!this.active)
	    {
            var maxBitsToSimulate = 28; // 30 qubits needs 8GB of RAM, and a lot of time to simulate.
            if (qc_options && qc_options.max_state_vector_sim_qubits)
              maxBitsToSimulate = qc_options.max_state_vector_sim_qubits;
            if (this.numQubits > maxBitsToSimulate)
            {
              {
                this.disableSimulation = true;
                console.log('This QC has ' + this.numQubits + ' qubits, ' +
                  'which would be ' + (Math.pow(2, this.numQubits + 3) / (1024 * 1024 * 1024)).toFixed(1) + ' GB, so I\'m going to disable simulation.');
                if (printSpeedMetrics || (enableGPUBlocks && webgl_blocks.side_by_side_checking))
                {
                  console.log('BUT since printSpeedMetrics is on, I\'ll leave the sim running and it\'ll be your own fault if the machine catches fire.');
                  this.disableSimulation = false;
                }
              }
            }
            else
            {
              this.disableSimulation = false;
            }
//this.disableSimulation = true;
            if (printSpeedMetrics && !this.disableSimulation) {
              console.log('Using '+this.numBlocks+' blocks of '+
                          human_data_size(this.bytesPerBlock)+' each.'+
                          ' '+this.numBlocks+' x ('+this.numBlockValues+' x 2 x '+this.bytesPerFloat+')'+
                          ' = '+((this.bytesPerBlock / (1024 * 1024)) * this.numBlocks)+' MiB');
            }

            if (this.disableSimulation)
                this.storage = new QNullBlock(this.numQubits, this);
            else if (this.numQubits <= this.numBlockQubits)
                this.storage = new QBlock(this.numQubits, this);
            else
                this.storage = new QRegNode(this.numQubits, this);

            var initValue = 0;
            this.invalidateAllClassicalBits();
            this.storage.initialize(initValue); // Initialize the data to |0>
            this.setAllClassicalBits(initValue);
	        this.active = true;

            // Now see if we have qInts already pending
            for (var key in this.qInts)
              this.qInts[key].reserve();

            this.changed();
	    }
	}

  this.startPhotonSim = function(targetQubits, instruction, default_modes_per_qubit)
  {
    if (this.use_photon_sim)
      return;
    if (this.core_sim)
      return;
    if (default_modes_per_qubit == null)
      default_modes_per_qubit = 1;
    if (this.photonSim == null)
      this.photonSim = new PhotonSim();
    this.photonSim.reset(this, targetQubits, instruction, default_modes_per_qubit);
    this.photonSim.transferLogicalToPhotonic();
    this.use_photon_sim = true;
  }

  this.stopPhotonSim = function(targetQubits, instruction)
  {
    if (this.core_sim)
      return;
    if (this.photonSim)
      this.photonSim.transferPhotonicToLogical();
    this.use_photon_sim = false;
  }


  this.startCHPSim = function(targetQubits, instruction)
  {
    if (this.chp == null)
      this.chp = new CHPSimulator();
    this.chp.reset(this, targetQubits, instruction);
    this.chp.transferLogicalToCHP();
    this.chp.active = true;
  }

  this.stopCHPSim = function(targetQubits, instruction)
  {
    if (this.chp)
    {
      this.chp.transferCHPToLogical();
      this.chp.active = false;
    }
  }

  this.pushMixedState = function(targetQubits, params, instruction)
  {
    if (this.mixed_states == null)
      this.mixed_states = [];
    var new_state = {};
    new_state.name = params;
    // Each mix requires a whole new QReg. That's expensive!
    new_state.reg = new QReg(this.numQubits, this.numBlockQubits, this.doublePrecision);
    new_state.reg.activate();
    // Copy the entire vector
    // TODO: This can be much (much) faster, if we know the formats match.
    for (var val = 0; val < this.numValues; ++val)
    {
        var cval = this.peekComplexValue(val);
        new_state.reg.pokeComplexValue(val, cval.x, cval.y);
    }

    this.mixed_states.push(new_state);
    console.log('use mixed state(): there are ' + this.mixed_states.length + ' states');
    return this.mixed_states.length - 1;
  }

  this.useMixedState = function(targetQubits, params, instruction)
  {
    if (this.mixed_states == null || this.mixed_states.length == 0)
      return;
    if (this.current_mix == null)
      this.current_mix = [];
    this.current_mix = params;
    this.mergeMixedStates();
    console.log('use mixed state(): there are ' + this.mixed_states.length + ' states');
  }

  this.mergeMixedStates = function()
  {
    if (this.mixed_states == null || this.mixed_states.length == 0)
      return;
    if (this.current_mix == null || this.current_mix.length == 0)
      return;

//    this.setZero();

    for (var val = 0; val < this.numValues; ++val)
    {
      var total_mag = 0;
      for (var m = 0; m < this.current_mix.length; ++m)
      {
        var cm = this.current_mix[m];
        var mix_prob = cm[0];
        var cval = this.mixed_states[cm[1]].reg.peekComplexValue(val);
        var mag = cval.x * cval.x + cval.y * cval.y;
        total_mag += mix_prob * mag;
      }
      this.pokeComplexValue(val, Math.sqrt(total_mag), 0);
    }
  }

    this.findClosestUtilityBit = function(matchBit)
    {
      var closestBit = -1;
      var closestDist = -1;
      for (var i = 0; i < this.utilityInts.length; ++i)
      {
        var ui = this.utilityInts[i];
        var start = ui.startBit;
        var count = ui.numBits;
        if (this.position_encoded)
        {
            start <<= 1;
            count <<= 1;
        }

        for (var j = 0; j < count; ++j)
        {
          var bit = start + j;
          var dist = Math.abs(bit - matchBit);
          if (dist < closestDist || closestBit < 0)
          {
            closestBit = bit;
            closestDist = dist;
          }
        }
      }
      return closestBit;
    }

    this.getQubitIntMenuArray = function()
    {
        var returnVal = [];
        for (var key in this.qInts)
        {
            var qint = this.qInts[key];
            returnVal.push(new Option(qint.name, qint.name));
        }
        return returnVal;
    }

    this.getNamedQubitInt = function(name)
    {
        for (var key in this.qInts)
        {
            var qint = this.qInts[key];
            if (qint.name == name)
              return qint;
        }
        return null;
    }

    this.getQubitIntName = function(bit)
    {
        if (this.position_encoded)
            bit >>= 1;

        for (var key in this.qInts)
        {
            var qint = this.qInts[key];
            var intBit = bit - qint.startBit;
            if (intBit >= 0 && intBit < qint.numBits)
              return qint.name;
        }
        return '';
    }

    this.getQubitIntPlace = function(bit)
    {
        var plus_minus = '';
        if (this.position_encoded)
        {
            plus_minus = (bit & 1) ? ' - ' : ' +';
            bit >>= 1;
        }

        for (var key in this.qInts)
        {
            var qint = this.qInts[key];
            var intBit = bit - qint.startBit;
            if (intBit >= 0 && intBit < qint.numBits)
              return (1 << intBit).toString(16) + plus_minus;
        }

        return bitfieldHexString(newShiftedMask(1, bit)) + plus_minus;
    }

    this.removeAllQInts = function()
    {
        for (var key in this.qInts)
        {
            this.qInts[key].release();
            delete this.qInts[key];
        }
        this.qInts = new Array();
        this.utilityInts = new Array();
        this.qIntsChanged();
    }

    this.qIntsChanged = function()
    {
        for (var i = 0; i < this.widgets.length; ++i)
        {
            if (this.widgets[i].qIntsChanged)
              this.widgets[i].qIntsChanged();
        }
    }

    this.complete_state_vector_to_string = function()
    {
      var num_values_to_print = this.numValues;
      var max_values_to_print = 1000;
      if (num_values_to_print > max_values_to_print)
      {
        num_values_to_print = max_values_to_print;
        qc.print('(state vector truncated to ' + num_values_to_print + ' values)');
      }
      var str = '';
      str += 'state_vector:[\n';
      for (var i = 0; i < num_values_to_print; ++i)
      {
        var cv = this.peekComplexValue(i);
        str += '' + cv.x + ',' + cv.y + ',\n';
      }
      str += ']\n';
      return str;
    }

	this.deactivate = function ()
	{
	    if (this.active)
	    {
            for (var key in this.qInts)
              this.qInts[key].release();
	        this.active = false;
            this.storage.destruct();
            delete this.storage;
            this.storage = null;
            this.invalidateAllClassicalBits();
            ////////////////////////////////////////
            // Here we really REALLY try to clean out this memory, because it can be huge.
            if (typeof(CollectGarbage) == "function")
                CollectGarbage();
//            nsIDOMWindowUtils.garbageCollect();
//            window.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
//              .getInterface(Components.interfaces.nsIDOMWindowUtils)
//              .garbageCollect();
//            Components.utils.forceGC();
	    }
	}

   	this.isActive = function ()
   	{
   	    return this.active;
   	}

   	this.bytesRequired = function ()
   	{
   	    return this.numValues * this.bytesPerFloat * 2;
   	}

   	this.reserveBits = function (numBits)
   	{
   	    var startBit = 0;
   	    var span = 0;
   	    while (startBit + numBits <= this.numQubits)
   	    {
   	        for (var span = 0; span < numBits && (!this.reservedBits[startBit + span]); ++span)
   	        {
   	        }
   	        if (span == numBits)
   	        {
   	            for (var i = 0; i < numBits; ++i)
   	            {
   	                this.reservedBits[startBit + i] = true; // mark as reserved
   	            }
   	            return startBit;
   	        }
            startBit++;
        }
   	    return -1; // failed to get the bits we need
   	}

   	this.releaseBits = function (numBits, startBit)
   	{
   	    for (var i = 0; i < numBits; ++i)
   	    {
   	        this.reservedBits[startBit + i] = false;
   	    }
   	}

   	this.peekAllValues = function ()
   	{
   	    if (!this.active)
   	        return null;
   	    return this.values;
   	}

   	this.changed = function ()
   	{
    		if (!this.animateWidgets || (qc_options && qc_options.speed_is_priority))
    			return;

        for (var i = 0; i < this.widgets.length; ++i)
        {
            this.widgets[i].changed();
        }
   	}

   	this.forceChanged = function ()
   	{
        for (var i = 0; i < this.widgets.length; ++i)
        {
            this.widgets[i].changed();
        }
   	}

   	this.message = function (msg, bitMask, arg1)
	{
        for (var i = 0; i < this.widgets.length; ++i)
        {
            this.widgets[i].message(msg, bitMask, arg1);
        }
	}


    // Track bit states for easy querying

    // This gets called whenever quantum funkiness affects some bits
   	this.invalidateClassicalBits = function(mask, condition)
   	{
        if (mask == null)
            mask = this.allBitsMask;
        // If there are condition bits, and all of them are classically valid,
        // then we don't need to invalidate.
        if (condition)
        {
            var cond = to_bitfield(condition);
            if ((cond & this.classicalBitsValid) == cond)
                return;
        }
        this.classicalBitsValid &= ~to_bitfield(mask);
   	}

    this.debugCheckClassicalBitsValidity = function(reportSuccessAlso)
    {
        var mask = to_bitfield(this.allBitsMask);
        var bit = bitfield_one;
        var badBits = 0;
        while (bit & mask)
        {
            if (bit & this.classicalBitsValid)
            {
                var actual = this.peekQubitProbability(bit);
                if (bit & this.classicalBits)
                {
                    if (actual < 0.9999)
                        badBits |= bit;
                }
                else
                {
                    if (actual != 0)
                        badBits |= bit;
                }
            }
            bit <<= 1;
        }
        if (badBits)
        {
            console.log('================ Invalid Classical bit(s) '+badBits+' ====================')
            crash.here();
        }
        else if (reportSuccessAlso)
        {
            console.log('================ Classical bits ok '+this.classicalBitsValid+' '+this.classicalBits+' ====================')
        }
    }

    this.invalidateAllClassicalBits = function()
    {
        this.invalidateClassicalBits(this.allBitsMask);
    }

    // This gets called whenever bits collapse to a known state
   	this.setClassicalBits = function(mask, values)
   	{
        mask = to_bitfield(mask);
        values = to_bitfield(values);
        this.classicalBitsValid |= mask;
        this.classicalBits &= ~mask;
        this.classicalBits |= values & mask;
   	}

   	this.setAllClassicalBits = function(values)
   	{
        this.setClassicalBits(this.allBitsMask, values);
   	}

  	this.classicalBit = function (bitMask)
   	{
        return (this.classicalBits & bitMask) != 0;
   	}

   	this.classicalBitValid = function (bitMask)
   	{
        return (this.classicalBitsValid & bitMask) != 0;
   	}

   	this.toggleCat = function ()
   	{
        this.catVisible = !this.catVisible;
        this.changed();
   	}

    //////////////////////////////////////////////////
    // Construction & initialization

    this.active = false;
    this.storage = null;
    this.qInts = new Array();
    this.utilityInts = new Array();
    // classicalBits are used for testing and fast easy reading.
    // When they're valid, reading them is as good as reading the QReg,
    // and a lot faster.
    this.classicalBits = bitfield_zero;
    this.classicalBitsValid = bitfield_zero;

    // The instruction we're currently processing
    this.currentInstruction = null;

    this.widgets = new Array();
    this.catVisible = false;

    this.setSize(numQubits, numBlockQubits, doublePrecision);

}

// Node.js hookups
module.exports.QReg = QReg;
module.exports.QRegNode = QRegNode;
module.exports.QBlock = QBlock;
module.exports.printSpeedMetrics = printSpeedMetrics;
module.exports.enableMonolithicArray = enableMonolithicArray;
module.exports.fullDebugChecking = fullDebugChecking;
module.exports.enableGPUBlocks = enableGPUBlocks;
