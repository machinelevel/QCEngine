/////////////////////////////////////////////////////////////////////////////
// qcengine_bitfield.js
// Copyright 2015 Eric Johnston
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

var recycled_bitfields = [];

function GetRecycledBitfield(data, numBits)
{
//  return null;
  // See if we have a recycled bitfield we can use
  if (recycled_bitfields[numBits] && recycled_bitfields[numBits].length > 0)
  {
    var bf = recycled_bitfields[numBits].pop();
    bf.set(data);
    return bf;
  }
  return null;
}

function NewBitField(data, numBits)
{
  if (numBits == null)
  {
    if (data && data.isBitField)
      numBits = data.numBits;
    else
      numBits = 32;
  }
  numBits = (numBits + 31) & ~31;

  var rbf = GetRecycledBitfield(data, numBits);
  if (rbf)
    return rbf;

  return new BitField(data, numBits);
}

// An arbitrary-length bitfield
function BitField(data, numBits)
{
  if (numBits == null)
  {
    if (data && data.isBitField)
      numBits = data.numBits;
    else
      numBits = 32;
  }

  // If the bitfield is small, just return an int.
//  if (0 && numBits <= 32)
//  {
//    if (data.isBitField)
//      return data.values[0];
//    return data;
//  }

  numBits = (numBits + 31) & ~31;

  var rbf = GetRecycledBitfield(data, numBits);
  if (rbf)
    return rbf;

  this.isBitField = true;
  this.numBits = numBits;
  this.values = new Uint32Array(new ArrayBuffer(numBits / 8));

  // Auto-convert to int
  this.valueOf = function()
  {
      return bitFieldToInt(this);
  }

  this.extendStorage = function(newNumBits)
  {
      // We need to extend the storge. Just create a new BF and switch to it.
      var numBits = (newNumBits + 31) & ~31;
      this.numBits = numBits;

      // Copy the values
      var oldValues = this.values;
      this.values = new Uint32Array(new ArrayBuffer(numBits / 8));
      for (var i = 0; i < oldValues.length; ++i)
        this.values[i] = oldValues[i];
      this.values[this.values.length - 1] = 0;
  }

  this.set = function(val)
  {
    for (var i = 0; i < this.values.length; ++i)
      this.values[i] = 0;
    if (val)
    {
      if (!val.isBitField)
        this.values[0] = val;
      else
        for (var i = 0; i < this.values.length && i < val.values.length; ++i)
          this.values[i] = val.values[i];
    }
  }

  this.set(data);

  this.recycle = function()
  {
    if (!recycled_bitfields[this.numBits])
      recycled_bitfields[this.numBits] = new Array();
    recycled_bitfields[this.numBits].push(this);
  }

  // return true if all 1-bits in val are 1 in bitfield
  this.testBits = function(val)
  {
    if (!val.isBitField)
      return ((this.values[0] & val) == val);

    // NOTE: This 0| prevents a very very confusing JavaScript issue, where
    //       a = 4294836224
    //       b = 4294836224
    //       a & b = -131072
    //       ...so even though a and b are the same, a & b != a
    for (var i = 0; i < this.values.length && i < val.values.length; ++i)
      if ((this.values[i] & val.values[i]) != (0|val.values[i]))
        return false;
    return true;
  }

  // return true if ANY 1-bits in val are 1 in bitfield
  this.andIsNotEqualZero = function(val)
  {
    if (!val.isBitField)
      return ((this.values[0] & val) != 0);

    for (var i = 0; i < this.values.length && i < val.values.length; ++i)
      if ((this.values[i] & val.values[i]) != 0)
        return true;
    return false;
  }


  // return true if all 1-bits in val are 1 in bitfield
  this.isEqualTo = function(val)
  {
    if (!val.isBitField)
      return (this.values[0] == val);

    for (var i = 0; i < this.values.length && i < val.values.length; ++i)
      if (this.values[i] != val.values[i])
        return false;
    return true;
  }

  this.setBit = function(shift, val)
  {
    this.setBits(shift, 1, val);
  }

  this.getBit = function(shift)
  {
    return this.getBits(shift, 1);
  }

  this.xorBit = function(shift, val)
  {
    this.xorBits(shift, 1, val);
  }

  this.invert = function()
  {
      for (var i = 0; i < this.values.length; ++i)
        this.values[i] = ~this.values[i];
  }

  // Given a 32-bit baseMask, set this bitfield to that mask, shifted left by shiftBits
  this.setBits = function(shift, mask, data)
  {
    data &= mask;
    var intIndex = 0|(shift / 32);
    var bitIndex = shift % 32;
    if (intIndex < this.values.length)
    {
      if (bitIndex == 0)
      {
        this.values[intIndex] &= ~mask;
        this.values[intIndex] |= data;
      }
      else
      {
        // NOTE: This looks unnecessarily complicated, but it avoids an
        //       issue with JavaScript where x>>32 returns x.
        var mask0 = mask << bitIndex;
        var data0 = data << bitIndex;
        this.values[intIndex] &= ~mask0;
        this.values[intIndex] |= data0;
        if ((intIndex + 1) < this.values.length)
        {
          var mask1 = mask >>> (32 - bitIndex);
          var data1 = data >>> (32 - bitIndex);
          this.values[intIndex + 1] &= ~mask1;
          this.values[intIndex + 1] |= data1;
        }
      }
    }
  }

  this.getBits = function(shift, mask)
  {
    if (mask == null)
      mask = -1;
    var intIndex = 0|(shift / 32);
    var bitIndex = shift % 32;
    var result = 0;
    if (intIndex < this.values.length)
    {
      if (bitIndex == 0)
        return this.values[intIndex] & mask;
      result = this.values[intIndex] >>> bitIndex;
      if ((intIndex + 1) < this.values.length)
        result |= this.values[intIndex + 1] << (32 - bitIndex);
      return result & mask;
    }
  }

  this.xorBits = function(shift, mask, data)
  {
    var bits = this.getBits(shift, mask);
    bits ^= data;
    this.setBits(shift, mask, bits);
  }

  this.andEquals = function(b)
  {
//    var before = bitfieldHexString(this);
    if (!b)
      return;
    if (!b.isBitField)
      this.values[0] |= b;
    else
    {
      for (var i = 0; i < this.values.length; ++i)
      {
        if (i < b.values.length)
          this.values[i] &= b.values[i];
        else
          this.values[i] = 0;
      }
    }
//    console.log( before + ' and ' + bitfieldHexString(b) + '=' + bitfieldHexString(this));
  }

  this.orEquals = function(b)
  {
//    var before = bitfieldHexString(this);
    if (!b)
      return;
    if (!b.isBitField)
      this.values[0] |= b;
    else
      for (var i = 0; i < this.values.length && i < b.values.length; ++i)
        this.values[i] |= b.values[i];
//    console.log( before + ' or ' + bitfieldHexString(b) + '=' + bitfieldHexString(this));
  }

  this.xorEquals = function(b)
  {
//    var before = bitfieldHexString(this);
    if (!b)
      return;
    if (!b.isBitField)
      this.values[0] ^= b;
    else
      for (var i = 0; i < this.values.length && i < b.values.length; ++i)
        this.values[i] ^= b.values[i];
//    console.log( before + ' xor ' + bitfieldHexString(b) + '=' + bitfieldHexString(this));
  }

  this.xorIntMask = function(qi, mask)
  {
    if (!qi)
      return;
    if (mask == null)
      mask = qi.baseMask;

    this.xorBits(qi.startBit, mask, mask);
  }

  this.or = function(b)
  {
    var ret = new BitField(this);
    ret.orEquals(b);
    return ret;
  }

  this.isAllZero = function()
  {
    for (var i = 0; i < this.values.length; ++i)
      if (this.values[i])
        return false;
    return true;
  }

  // Get the index of the lowest bit set, or -1 if none
  this.getLowestBitIndex = function()
  {
    for (var i = 0; i < this.numBits; ++i)
      if (this.getBit(i))
        return i;
    return -1;
  }

  // Get the index of the lowest bit set, or -1 if none
  this.getHighestBitIndex = function()
  {
    for (var i = this.numBits - 1; i >= 0; --i)
      if (this.getBit(i))
        return i;
    return -1;
  }

  // Get the index of the lowest bit set, or -1 if none
  this.countOneBits = function()
  {
    var total = 0;
    for (var i = 0; i < this.values.length; ++i)
    {
      // Cound tdo this slightly faster, but don't trust
      // JavaScript bit-handling, so playing it safe
      var x = this.values[i];
      while (x)
      {
        total += (x & 1);
        x >>>= 1;
      }
    }
    return total;
  }



  // Shift all bits left one place, extending if necessary
  this.shiftLeft1 = function()
  {
//    var before = bitfieldHexString(this);
    if (this.values[this.values.length - 1] & (1 << 31))
      this.extendStorage(this.numBits + 1);

    for (var i = this.values.length - 1; i > 0; --i)
      this.values[i] = (this.values[i] << 1) | (this.values[i - 1] >>> 31);
    this.values[0] <<= 1;
//    console.log(before + ' << 1 = ' + bitfieldHexString(this));
  }

  // Shift all bits right one place
  this.shiftRight1 = function()
  {
//    var before = bitfieldHexString(this);
    for (var i = 0; i < this.values.length - 1; ++i)
      this.values[i] = (this.values[i] >>> 1) | (this.values[i + 1] << 31);
    this.values[this.values.length - 1] >>>= 1; // >>> prevents sign-extension
//    console.log(before + ' >> 1 = ' + bitfieldHexString(this));
  }

  // Fast-shift all bits left 32 places
  this.shiftLeft32 = function()
  {
    if (this.values[this.values.length - 1])
      this.extendStorage(this.numBits + 32);
    for (var i = 0; i < this.values.length - 1; ++i)
      this.values[i + 1] = this.values[i];
    this.values[0] = 0;
  }

  // Fast-shift all bits right 32 places
  this.shiftRight32 = function()
  {
    for (var i = 0; i < this.values.length - 1; ++i)
      this.values[i] = this.values[i + 1];
    this.values[this.values.length - 1] = 0;
  }

  // TODO: The 32-bit shift can be much faster than one-at-a-time
  // TODO: The 1-bit shift can be much faster than one-at-a-time
  // Shift all bits left
  this.shiftLeft = function(shift)
  {
    while (shift >= 32)
    {
      this.shiftLeft32();
      shift -= 32;
    }
    while (shift > 0)
    {
      this.shiftLeft1();
      shift--;
    }
  }

  // Shift all bits right
  this.shiftRight = function(shift)
  {
    while (shift >= 32)
    {
      this.shiftRight32();
      shift -= 32;
    }
    while (shift > 0)
    {
      this.shiftRight1();
      shift--;
    }
  }
}


function bitFieldToInt(bf)
{
  if (bf.isBitField)
    return bf.getBits(0, -1);
  return bf;
}

function intToBitField(bf)
{
  if (bf.isBitField)
    return bf;
  return new BitField(bf);
}

function getBitfieldBit(bf, shift)
{
  if (bf.isBitField)
    return bf.getBit(shift);
  return (bf >> shift) & 1;
}

function getLowestBitIndex(bf)
{
  if (bf.isBitField)
    return bf.getLowestBitIndex();
  for (var i = 0; i < 32; ++i)
    if (bf & (1 << i))
      return i;
  return -1;
}

function getHighestBitIndex(bf)
{
  if (bf.isBitField)
    return bf.getHighestBitIndex();
  for (var i = 31; i >= 0; --i)
    if (bf & (1 << i))
      return i;
  return -1;
}

// Check a bitfield or an int for all-zero
function isAllZero(bf)
{
  if (!bf)
    return true;
  if (bf.isBitField)
    return bf.isAllZero();
  return false;
}

// Check a bitfield or an int for all-zero
function getBit(bf, bit_index)
{
  if (!bf)
    return 0;
  if (bf.isBitField)
    return bf.getBit(bit_index);
  return (bf >> bit_index) & 1;
}

function bitFieldsAreIdentical(bf1, bf2)
{
  if (!bf1 && !bf2)
    return true;
  if (!bf1 || !bf2)
    return false;
  return bf1.isEqualTo(bf2);
}


// Return an array with the indices of all 1 bits in the field
function makeBitArray(bf, max_length)
{
  var result = [];

  if (bf)
  {
    if (bf.isBitField)
    {
      for (var i = 0; i < bf.values.length && result.length < max_length; ++i)
      {
        if (bf.values[i])
        {
          for (var j = 0; j < 32 && result.length < max_length; ++j)
          {
            if (bf.values[i] & (1 << j))
              result.push(i * 32 + j);
          }
        }
      }
    }
    else
    {
      for (var i = 0; i < 32 && result.length < max_length; ++i)
      {
        if (bf & (1 << i))
          result.push(i);
      }
    }
  }
  return result;
}


function newShiftedMask(mask, shift)
{
  var bf = NewBitField(0, 32 + shift);  // TODO: (minor) scan to see how many bits we actually need
  bf.set(0);
  bf.setBits(shift, mask, mask);
  return bf;
}

// Create a mask of all 1 bits, shifted up
function newShiftedOnesMask(mask_num_bits, shift)
{
  var bf = NewBitField(0, mask_num_bits + shift);
  bf.set(0);
  var num_32bit_chunks = 0|(mask_num_bits / 32);
  var extra_bits = mask_num_bits % 32;
  for (var i = 0; i < num_32bit_chunks; ++i)
    bf.values[i] = -1;
  bf.values[num_32bit_chunks] = (1 << extra_bits) - 1;
  bf.shiftLeft(shift);
  return bf;
}

function bitfieldHexString(bitField)
{
  if (!bitField.isBitField)
    return bitField.toString(16);
  var str = '';
  var found_nonzero = false;
  for (var i = bitField.values.length - 1; i >= 0; --i)
  {
    var bitStr = bitField.values[i].toString(16);
    var digits = bitStr.length;
    if (found_nonzero)
    {
      if (i < bitField.values.length - 1)
        while (digits++ < 8)
          str += '0';
    }
    if (found_nonzero || bitField.values[i] || i == 0)
      str += bitStr;
    if (bitField.values[i])
      found_nonzero = true;
  }
  return str;
}






function BitSwapper(numBits)
{
  this.table = new Uint32Array(new ArrayBuffer(numBits * 4));
  this.numBits = numBits;
  for (var i = 0; i < this.numBits; ++i)
    this.table[i] = i;

  this.swap = function(a, b, instruction)
  {
    var temp = this.table[a];
    this.table[a] = this.table[b];
    this.table[b] = temp;
    if (instruction)
    {
      var old_targ = new BitField(instruction.targetQubits);
      var old_cond = new BitField(instruction.conditionQubits);
      var old_aux = null;
      if (instruction.auxQubits)
        var old_aux = new BitField(instruction.auxQubits);

      instruction.targetQubits.setBit(a, old_targ.getBit(b));
      instruction.targetQubits.setBit(b, old_targ.getBit(a));
      instruction.conditionQubits.setBit(a, old_cond.getBit(b));
      instruction.conditionQubits.setBit(b, old_cond.getBit(a));
      if (old_aux)
      {
        instruction.auxQubits.setBit(a, old_aux.getBit(b));
        instruction.auxQubits.setBit(b, old_aux.getBit(a));
      }
    }
  }

  this.convertBitField = function(bf)
  {
    if (!bf)
      return;
    var old_bf = new BitField(bf);
    for (var i = 0; i < this.numBits; ++i)
    {
      if (this.table[i] != i)
      {
        bf.setBit(i, old_bf.getBit(this.table[i]));
      }
    }
  }

  this.convertInstruction = function(inst)
  {
    this.convertBitField(inst.targetQubits);
    this.convertBitField(inst.conditionQubits);
    this.convertBitField(inst.auxQubits);
  }

}

// Node.js glue: this line is needed to make the Node.js exports work in a browser.
if (typeof module === 'undefined') module = {exports:{}};
// Node.js hookups
module.exports.BitField = BitField;
module.exports.newShiftedMask = newShiftedMask;
module.exports.bitFieldToInt = bitFieldToInt;
module.exports.intToBitField = intToBitField;
module.exports.isAllZero = isAllZero;
module.exports.makeBitArray = makeBitArray;
module.exports.bitfieldHexString = bitfieldHexString;
module.exports.getLowestBitIndex = getLowestBitIndex;
module.exports.getHighestBitIndex = getHighestBitIndex;
module.exports.NewBitField = NewBitField;
module.exports.getBitfieldBit = getBitfieldBit;
module.exports.getBit = getBit;
