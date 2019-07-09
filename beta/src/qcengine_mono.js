var recycled_bitfields = [];
function GetRecycledBitfield(data, numBits) {
  if (recycled_bitfields[numBits] && recycled_bitfields[numBits].length > 0) {
    var bf = recycled_bitfields[numBits].pop();
    bf.set(data);
    return bf;
  }
  return null;
}
function NewBitField(data, numBits) {
  if (numBits == null) {
    if (data && data.isBitField) {
      numBits = data.numBits;
    } else {
      numBits = 32;
    }
  }
  numBits = numBits + 31 & ~31;
  var rbf = GetRecycledBitfield(data, numBits);
  if (rbf) {
    return rbf;
  }
  return new BitField(data, numBits);
}
function BitField(data, numBits) {
  if (numBits == null) {
    if (data && data.isBitField) {
      numBits = data.numBits;
    } else {
      numBits = 32;
    }
  }
  numBits = numBits + 31 & ~31;
  var rbf = GetRecycledBitfield(data, numBits);
  if (rbf) {
    return rbf;
  }
  this.isBitField = true;
  this.numBits = numBits;
  this.values = new Uint32Array(new ArrayBuffer(numBits / 8));
  this.extendStorage = function(newNumBits) {
    var numBits = newNumBits + 31 & ~31;
    this.numBits = numBits;
    var oldValues = this.values;
    this.values = new Uint32Array(new ArrayBuffer(numBits / 8));
    for (var i = 0;i < oldValues.length;++i) {
      this.values[i] = oldValues[i];
    }
    this.values[this.values.length - 1] = 0;
  };
  this.set = function(val) {
    for (var i = 0;i < this.values.length;++i) {
      this.values[i] = 0;
    }
    if (val) {
      if (!val.isBitField) {
        this.values[0] = val;
      } else {
        for (var i = 0;i < this.values.length && i < val.values.length;++i) {
          this.values[i] = val.values[i];
        }
      }
    }
  };
  this.set(data);
  this.recycle = function() {
    if (!recycled_bitfields[this.numBits]) {
      recycled_bitfields[this.numBits] = new Array;
    }
    recycled_bitfields[this.numBits].push(this);
  };
  this.testBits = function(val) {
    if (!val.isBitField) {
      return (this.values[0] & val) == val;
    }
    for (var i = 0;i < this.values.length && i < val.values.length;++i) {
      if ((this.values[i] & val.values[i]) != (0 | val.values[i])) {
        return false;
      }
    }
    return true;
  };
  this.andIsNotEqualZero = function(val) {
    if (!val.isBitField) {
      return (this.values[0] & val) != 0;
    }
    for (var i = 0;i < this.values.length && i < val.values.length;++i) {
      if ((this.values[i] & val.values[i]) != 0) {
        return true;
      }
    }
    return false;
  };
  this.isEqualTo = function(val) {
    if (!val.isBitField) {
      return this.values[0] == val;
    }
    for (var i = 0;i < this.values.length && i < val.values.length;++i) {
      if (this.values[i] != val.values[i]) {
        return false;
      }
    }
    return true;
  };
  this.setBit = function(shift, val) {
    this.setBits(shift, 1, val);
  };
  this.getBit = function(shift) {
    return this.getBits(shift, 1);
  };
  this.xorBit = function(shift, val) {
    this.xorBits(shift, 1, val);
  };
  this.invert = function() {
    for (var i = 0;i < this.values.length;++i) {
      this.values[i] = ~this.values[i];
    }
  };
  this.setBits = function(shift, mask, data) {
    data &= mask;
    var intIndex = 0 | shift / 32;
    var bitIndex = shift % 32;
    if (intIndex < this.values.length) {
      if (bitIndex == 0) {
        this.values[intIndex] &= ~mask;
        this.values[intIndex] |= data;
      } else {
        var mask0 = mask << bitIndex;
        var data0 = data << bitIndex;
        this.values[intIndex] &= ~mask0;
        this.values[intIndex] |= data0;
        if (intIndex + 1 < this.values.length) {
          var mask1 = mask >>> 32 - bitIndex;
          var data1 = data >>> 32 - bitIndex;
          this.values[intIndex + 1] &= ~mask1;
          this.values[intIndex + 1] |= data1;
        }
      }
    }
  };
  this.getBits = function(shift, mask) {
    if (mask == null) {
      mask = -1;
    }
    var intIndex = 0 | shift / 32;
    var bitIndex = shift % 32;
    var result = 0;
    if (intIndex < this.values.length) {
      if (bitIndex == 0) {
        return this.values[intIndex] & mask;
      }
      result = this.values[intIndex] >>> bitIndex;
      if (intIndex + 1 < this.values.length) {
        result |= this.values[intIndex + 1] << 32 - bitIndex;
      }
      return result & mask;
    }
  };
  this.xorBits = function(shift, mask, data) {
    var bits = this.getBits(shift, mask);
    bits ^= data;
    this.setBits(shift, mask, bits);
  };
  this.andEquals = function(b) {
    if (!b) {
      return;
    }
    if (!b.isBitField) {
      this.values[0] |= b;
    } else {
      for (var i = 0;i < this.values.length;++i) {
        if (i < b.values.length) {
          this.values[i] &= b.values[i];
        } else {
          this.values[i] = 0;
        }
      }
    }
  };
  this.orEquals = function(b) {
    if (!b) {
      return;
    }
    if (!b.isBitField) {
      this.values[0] |= b;
    } else {
      for (var i = 0;i < this.values.length && i < b.values.length;++i) {
        this.values[i] |= b.values[i];
      }
    }
  };
  this.xorEquals = function(b) {
    if (!b) {
      return;
    }
    if (!b.isBitField) {
      this.values[0] ^= b;
    } else {
      for (var i = 0;i < this.values.length && i < b.values.length;++i) {
        this.values[i] ^= b.values[i];
      }
    }
  };
  this.xorIntMask = function(qi, mask) {
    if (!qi) {
      return;
    }
    if (mask == null) {
      mask = qi.baseMask;
    }
    this.xorBits(qi.startBit, mask, mask);
  };
  this.or = function(b) {
    var ret = new BitField(this);
    ret.orEquals(b);
    return ret;
  };
  this.isAllZero = function() {
    for (var i = 0;i < this.values.length;++i) {
      if (this.values[i]) {
        return false;
      }
    }
    return true;
  };
  this.getLowestBitIndex = function() {
    for (var i = 0;i < this.numBits;++i) {
      if (this.getBit(i)) {
        return i;
      }
    }
    return -1;
  };
  this.getHighestBitIndex = function() {
    for (var i = this.numBits - 1;i >= 0;--i) {
      if (this.getBit(i)) {
        return i;
      }
    }
    return -1;
  };
  this.countOneBits = function() {
    var total = 0;
    for (var i = 0;i < this.values.length;++i) {
      var x = this.values[i];
      while (x) {
        total += x & 1;
        x >>>= 1;
      }
    }
    return total;
  };
  this.shiftLeft1 = function() {
    if (this.values[this.values.length - 1] & 1 << 31) {
      this.extendStorage(this.numBits + 1);
    }
    for (var i = this.values.length - 1;i > 0;--i) {
      this.values[i] = this.values[i] << 1 | this.values[i - 1] >>> 31;
    }
    this.values[0] <<= 1;
  };
  this.shiftRight1 = function() {
    for (var i = 0;i < this.values.length - 1;++i) {
      this.values[i] = this.values[i] >>> 1 | this.values[i + 1] << 31;
    }
    this.values[this.values.length - 1] >>>= 1;
  };
}
function bitFieldToInt(bf) {
  if (bf.isBitField) {
    return bf.getBits(0, -1);
  }
  return bf;
}
function intToBitField(bf) {
  if (bf.isBitField) {
    return bf;
  }
  return new BitField(bf);
}
function getBitfieldBit(bf, shift) {
  if (bf.isBitField) {
    return bf.getBit(shift);
  }
  return bf >> shift & 1;
}
function getLowestBitIndex(bf) {
  if (bf.isBitField) {
    return bf.getLowestBitIndex();
  }
  for (var i = 0;i < 32;++i) {
    if (bf & 1 << i) {
      return i;
    }
  }
  return -1;
}
function getHighestBitIndex(bf) {
  if (bf.isBitField) {
    return bf.getHighestBitIndex();
  }
  for (var i = 31;i >= 0;--i) {
    if (bf & 1 << i) {
      return i;
    }
  }
  return -1;
}
function isAllZero(bf) {
  if (!bf) {
    return true;
  }
  if (bf.isBitField) {
    return bf.isAllZero();
  }
  return false;
}
function getBit(bf, bit_index) {
  if (!bf) {
    return 0;
  }
  if (bf.isBitField) {
    return bf.getBit(bit_index);
  }
  return bf >> bit_index & 1;
}
function bitFieldsAreIdentical(bf1, bf2) {
  if (!bf1 && !bf2) {
    return true;
  }
  if (!bf1 || !bf2) {
    return false;
  }
  return bf1.isEqualTo(bf2);
}
function makeBitArray(bf, max_length) {
  var result = [];
  if (bf) {
    if (bf.isBitField) {
      for (var i = 0;i < bf.values.length && result.length < max_length;++i) {
        if (bf.values[i]) {
          for (var j = 0;j < 32 && result.length < max_length;++j) {
            if (bf.values[i] & 1 << j) {
              result.push(i * 32 + j);
            }
          }
        }
      }
    } else {
      for (var i = 0;i < 32 && result.length < max_length;++i) {
        if (bf & 1 << i) {
          result.push(i);
        }
      }
    }
  }
  return result;
}
function newShiftedMask(mask, shift) {
  var bf = NewBitField(0, 32 + shift);
  bf.set(0);
  bf.setBits(shift, mask, mask);
  return bf;
}
function bitfieldHexString(bitField) {
  if (!bitField.isBitField) {
    return bitField.toString(16);
  }
  var str = "";
  var found_nonzero = false;
  for (var i = bitField.values.length - 1;i >= 0;--i) {
    var bitStr = bitField.values[i].toString(16);
    var digits = bitStr.length;
    if (found_nonzero) {
      if (i < bitField.values.length - 1) {
        while (digits++ < 8) {
          str += "0";
        }
      }
    }
    if (found_nonzero || bitField.values[i] || i == 0) {
      str += bitStr;
    }
    if (bitField.values[i]) {
      found_nonzero = true;
    }
  }
  return str;
}
function BitSwapper(numBits) {
  this.table = new Uint32Array(new ArrayBuffer(numBits * 4));
  this.numBits = numBits;
  for (var i = 0;i < this.numBits;++i) {
    this.table[i] = i;
  }
  this.swap = function(a, b, instruction) {
    var temp = this.table[a];
    this.table[a] = this.table[b];
    this.table[b] = temp;
    if (instruction) {
      var old_targ = new BitField(instruction.targetQubits);
      var old_cond = new BitField(instruction.conditionQubits);
      var old_aux = null;
      if (instruction.auxQubits) {
        var old_aux = new BitField(instruction.auxQubits)
      }
      instruction.targetQubits.setBit(a, old_targ.getBit(b));
      instruction.targetQubits.setBit(b, old_targ.getBit(a));
      instruction.conditionQubits.setBit(a, old_cond.getBit(b));
      instruction.conditionQubits.setBit(b, old_cond.getBit(a));
      if (old_aux) {
        instruction.auxQubits.setBit(a, old_aux.getBit(b));
        instruction.auxQubits.setBit(b, old_aux.getBit(a));
      }
    }
  };
  this.convertBitField = function(bf) {
    if (!bf) {
      return;
    }
    var old_bf = new BitField(bf);
    for (var i = 0;i < this.numBits;++i) {
      if (this.table[i] != i) {
        bf.setBit(i, old_bf.getBit(this.table[i]));
      }
    }
  };
  this.convertInstruction = function(inst) {
    this.convertBitField(inst.targetQubits);
    this.convertBitField(inst.conditionQubits);
    this.convertBitField(inst.auxQubits);
  };
}
;var printSpeedMetrics = false;
var enableMonolithicArray = false;
var fullDebugChecking = false;
var enableGPUBlocks = false;
function QBlock(numQubits, qReg) {
  this.qReg = qReg;
  this.numQubits = numQubits;
  this.bitValue = 1 << numQubits - 1;
  this.kidMask = this.bitValue - 1;
  this.values = null;
  this.allZero = false;
  if (!qReg.noCPUBlocks) {
    if (qReg.masterArray) {
      this.masterArrayStartIndex = qReg.masterNextIndex;
      qReg.masterNextIndex += 2 * qReg.numBlockValues;
      this.values = qReg.masterArray.subarray(this.masterArrayStartIndex, qReg.masterNextIndex);
    } else {
      if (qReg.doublePrecision) {
        this.values = new Float64Array(new ArrayBuffer(qReg.bytesPerBlock));
      } else {
        this.values = new Float32Array(new ArrayBuffer(qReg.bytesPerBlock));
      }
    }
  }
  this.gpuBlock = null;
  if (enableGPUBlocks && webgl_blocks.ready) {
    this.gpuBlock = webgl_blocks.allocateNewBlock();
  }
  this.setZero = function() {
    if (this.gpuBlock) {
      this.gpuBlock.op_clear(0);
      if (!webgl_blocks.side_by_side_checking) {
        return;
      }
    }
    var numValues = 1 << this.numQubits;
    numValues *= 2;
    for (var i = 0;i < numValues;++i) {
      this.values[i] = 0;
    }
    if (this.gpuBlock && webgl_blocks.side_by_side_checking) {
      this.gpuBlock.side_by_side_check("setZero", this.values);
    }
  };
  this.scaleValues = function(scale) {
    if (this.gpuBlock) {
      this.gpuBlock.op_scale(scale);
      if (!webgl_blocks.side_by_side_checking) {
        return;
      }
    }
    var numValues = 1 << this.numQubits;
    numValues *= 2;
    for (var i = 0;i < numValues;++i) {
      this.values[i] *= scale;
    }
    if (this.gpuBlock && webgl_blocks.side_by_side_checking) {
      this.gpuBlock.side_by_side_check("scaleValues", this.values);
    }
  };
  this.initialize = function(value) {
    if (this.gpuBlock) {
      this.gpuBlock.op_clear(1);
      for (var i = 0;i < this.numQubits;++i) {
        var mask = 1 << i;
        if (value & mask) {
          this.gpuBlock.op_not(mask);
        }
      }
      if (!webgl_blocks.side_by_side_checking) {
        return;
      }
    }
    var numValues = 1 << this.numQubits;
    numValues *= 2;
    for (var i = 0;i < numValues;++i) {
      this.values[i] = 0;
    }
    this.values[value * 2] = 1;
    if (this.gpuBlock && webgl_blocks.side_by_side_checking) {
      this.gpuBlock.side_by_side_check("initialize", this.values);
    }
  };
  this.destruct = function() {
    if (this.gpuBlock) {
      this.gpuBlock.destruct();
      this.gpuBlock = null;
    }
    delete this.values;
    this.values = null;
  };
}
function QRegNode(numQubits, qReg) {
  this.numQubits = numQubits;
  this.bitValue = 1 << numQubits - 1;
  this.kidMask = this.bitValue - 1;
  this.tree = new Array;
  if (numQubits - 1 <= qReg.numBlockQubits) {
    this.tree[0] = new QBlock(numQubits - 1, qReg);
    this.tree[1] = new QBlock(numQubits - 1, qReg);
  } else {
    this.tree[0] = new QRegNode(numQubits - 1, qReg);
    this.tree[1] = new QRegNode(numQubits - 1, qReg);
  }
  this.setZero = function() {
    this.tree[0].setZero();
    this.tree[1].setZero();
  };
  this.scaleValues = function(scale) {
    this.tree[0].scaleValues(scale);
    this.tree[1].scaleValues(scale);
  };
  this.initialize = function(value) {
    var target = value >> this.numQubits - 1;
    this.tree[target].initialize(value & this.kidMask);
    this.tree[1 - target].setZero();
  };
  this.destruct = function() {
    this.tree[0].destruct();
    this.tree[1].destruct();
    delete this.tree[0];
    delete this.tree[1];
    delete this.tree;
    this.tree = null;
  };
  this.swap = function() {
    var temp = this.tree[0];
    this.tree[0] = this.tree[1];
    this.tree[1] = temp;
  };
}
function QNullBlock(numQubits, qReg) {
  this.qReg = qReg;
  this.numQubits = numQubits;
  this.bitValue = 1 << numQubits - 1;
  this.kidMask = this.bitValue - 1;
  this.values = new BitField(0, this.numQubits);
  this.setZero = function() {
    this.values.set(0);
  };
  this.scaleValues = function(scale) {
  };
  this.initialize = function(value) {
    this.values.set(value);
  };
  this.read = function(targetQubits) {
    var result = new BitField(this.values);
    result.andEquals(targetQubits);
    return result;
  };
  this.destruct = function() {
  };
  this.not = function(targetQubit) {
    this.values.xorEquals(targetQubit);
  };
  this.cnot = function(targetQubit, conditionQubits, pairBranch) {
    if (this.values.testBits(conditionQubits)) {
      this.not(targetQubit);
    }
  };
  this.phaseShift = function(conditionQubits, sval, cval) {
  };
  this.op2x2 = function(targetQubit, opFunc, opData, pairBranch) {
  };
  this.cop2x2 = function(targetQubit, conditionQubits, opFunc, opData, pairBranch) {
    if (this.values.testBits(conditionQubits)) {
      this.op2x2(targetQubit, opFunc, opData, pairBranch);
    }
  };
  this.setZeroMask = function(targetQubits, targetValues) {
  };
  this.totalLengthSquared = function() {
    return 1;
  };
  this.peekQubitProbability = function(targetQubit) {
    if (this.values.testBits(targetQubit)) {
      return 1;
    }
    return 0;
  };
  this.peekComplexValue = function(targetValue) {
    if (this.values.isEqualTo(targetValue)) {
      return new Vec2(1, 0);
    }
    return new Vec2(0, 0);
  };
  this.pokeComplexValue = function(targetValue, x, y) {
    var threshold = .5 * .5;
    var prob = x * x + y * y;
    if (prob >= threshold) {
      this.values.set(targetValue);
    }
  };
}
function human_data_size(bytes) {
  var kilo = 1024;
  var mega = 1024 * 1024;
  var giga = 1024 * 1024 * 1024;
  if (bytes >= giga) {
    return "" + (bytes / giga).toFixed(0) + " GiB";
  }
  if (bytes >= mega) {
    return "" + (bytes / mega).toFixed(0) + " MiB";
  }
  if (bytes >= kilo) {
    return "" + (bytes / kilo).toFixed(0) + "k";
  } else {
    return "" + bytes + " bytes";
  }
}
function QReg(numQubits, numBlockQubits, doublePrecision) {
  this.animateWidgets = true;
  this.blockCanvas = null;
  this.blockCtx = null;
  this.glBlocks = null;
  this.noCPUBlocks = false;
  this.mbc = null;
  this.chp = null;
  this.mixed_states = null;
  this.current_mix = null;
  this.setSize = function(numQubits, numBlockQubits, doublePrecision) {
    if (numBlockQubits == null) {
      numBlockQubits = numQubits;
    }
    if (doublePrecision == null) {
      doublePrecision = false;
    }
    this.deactivate();
    this.numQubits = numQubits;
    this.numValues = 1 << this.numQubits;
    this.allBitsMask = new BitField(0, this.numQubits);
    for (var i = 0;i < this.numQubits;++i) {
      this.allBitsMask.setBit(i, 1);
    }
    this.numBlockQubits = numBlockQubits;
    this.numBlockValues = 1 << this.numBlockQubits;
    this.doublePrecision = doublePrecision;
    if (this.doublePrecision) {
      this.bytesPerFloat = 8;
    } else {
      this.bytesPerFloat = 4;
    }
    this.bytesPerBlock = this.numBlockValues * this.bytesPerFloat * 2;
    this.numBlocks = 1 << numQubits - numBlockQubits;
    this.reservedBits = new Array(this.numQubits);
    for (var i = 0;i < this.numQubits;++i) {
      this.reservedBits[i] = false;
    }
    this.reservedBitsHighWater = 0;
  };
  this.activate = function() {
    this.masterArray = null;
    this.masterNextIndex = 0;
    this.blockNotAsm = null;
    this.noCPUBlocks = false;
    this.photonSim = null;
    this.use_photon_sim = false;
    this.mixed_states = null;
    this.current_mix = null;
    this.did_use_photonic_sim = false;
    this.noise_mask = new BitField(0, this.numQubits);
    this.noise_level = new Array(this.numQubits);
    if (enableGPUBlocks) {
      webgl_blocks.initialize(this);
      if (!webgl_blocks.side_by_side_checking) {
        this.noCPUBlocks = true;
      }
    }
    if (enableMonolithicArray && !this.noCPUBlocks) {
      if (qReg.doublePrecision) {
        this.masterArray = new Float64Array(new ArrayBuffer(qReg.bytesPerBlock * this.numBlocks));
      } else {
        this.masterArray = new Float32Array(new ArrayBuffer(qReg.bytesPerBlock * this.numBlocks));
      }
      this.blockNotAsm = BlockAsmModule({Math:Math}, null, this.masterArray).not;
    }
    if (!this.active) {
      var maxBitsToSimulate = 28;
      var maxBitsValidAtAll = 32;
      if (this.numQubits > maxBitsToSimulate) {
        this.disableSimulation = true;
        console.log("This QC has " + this.numQubits + " qubits, " + "which would be " + (Math.pow(2, this.numQubits + 3) / (1024 * 1024 * 1024)).toFixed(1) + " GB, so I'm going to disable simulation.");
        if (this.numQubits > 52) {
          console.log("In fact, anything more than " + maxBitsValidAtAll + " bits may not work at all. Watch out.");
        }
        if (printSpeedMetrics || enableGPUBlocks && webgl_blocks.side_by_side_checking) {
          console.log("BUT since printSpeedMetrics is on, I'll leave the sim running and it'll be your own fault if the machine catches fire.");
          this.disableSimulation = false;
        }
      } else {
        this.disableSimulation = false;
      }
      if (printSpeedMetrics && !this.disableSimulation) {
        console.log("Using " + this.numBlocks + " blocks of " + human_data_size(this.bytesPerBlock) + " each." + " " + this.numBlocks + " x (" + this.numBlockValues + " x 2 x " + this.bytesPerFloat + ")" + " = " + this.bytesPerBlock / (1024 * 1024) * this.numBlocks + " MiB");
      }
      if (this.disableSimulation) {
        this.storage = new QNullBlock(this.numQubits, this);
      } else {
        if (this.numQubits <= this.numBlockQubits) {
          this.storage = new QBlock(this.numQubits, this);
        } else {
          this.storage = new QRegNode(this.numQubits, this);
        }
      }
      var initValue = 0;
      this.invalidateAllClassicalBits();
      this.storage.initialize(initValue);
      this.setAllClassicalBits(initValue);
      this.active = true;
      for (var key in this.qInts) {
        this.qInts[key].reserve();
      }
      this.changed();
    }
  };
  this.startPhotonSim = function(targetQubits, instruction) {
    if (this.photonSim == null) {
      this.photonSim = new PhotonSim;
    }
    this.photonSim.reset(this, targetQubits, instruction);
    this.photonSim.transferLogicalToPhotonic();
    this.use_photon_sim = true;
  };
  this.stopPhotonSim = function(targetQubits, instruction) {
    if (this.photonSim) {
      this.photonSim.transferPhotonicToLogical();
    }
    this.use_photon_sim = false;
  };
  this.startCHPSim = function(targetQubits, instruction) {
    if (this.chp == null) {
      this.chp = new CHPSimulator;
    }
    this.chp.reset(this, targetQubits, instruction);
    this.chp.transferLogicalToCHP();
    this.chp.active = true;
  };
  this.stopCHPSim = function(targetQubits, instruction) {
    if (this.chp) {
      this.chp.transferCHPToLogical();
      this.chp.active = false;
    }
  };
  this.pushMixedState = function(targetQubits, params, instruction) {
    if (this.mixed_states == null) {
      this.mixed_states = [];
    }
    var new_state = {};
    new_state.name = params;
    new_state.reg = new QReg(this.numQubits, this.numBlockQubits, this.doublePrecision);
    new_state.reg.activate();
    for (var val = 0;val < this.numValues;++val) {
      var cval = this.peekComplexValue(val);
      new_state.reg.pokeComplexValue(val, cval.x, cval.y);
    }
    this.mixed_states.push(new_state);
    console.log("use mixed state(): there are " + this.mixed_states.length + " states");
    return this.mixed_states.length - 1;
  };
  this.useMixedState = function(targetQubits, params, instruction) {
    if (this.mixed_states == null || this.mixed_states.length == 0) {
      return;
    }
    if (this.current_mix == null) {
      this.current_mix = [];
    }
    this.current_mix = params;
    this.mergeMixedStates();
    console.log("use mixed state(): there are " + this.mixed_states.length + " states");
  };
  this.mergeMixedStates = function() {
    if (this.mixed_states == null || this.mixed_states.length == 0) {
      return;
    }
    if (this.current_mix == null || this.current_mix.length == 0) {
      return;
    }
    for (var val = 0;val < this.numValues;++val) {
      var total_mag = 0;
      for (var m = 0;m < this.current_mix.length;++m) {
        var cm = this.current_mix[m];
        var mix_prob = cm[0];
        var cval = this.mixed_states[cm[1]].reg.peekComplexValue(val);
        var mag = cval.x * cval.x + cval.y * cval.y;
        total_mag += mix_prob * mag;
      }
      this.pokeComplexValue(val, Math.sqrt(total_mag), 0);
    }
  };
  this.findClosestUtilityBit = function(matchBit) {
    var closestBit = -1;
    var closestDist = -1;
    for (var i = 0;i < this.utilityInts.length;++i) {
      var ui = this.utilityInts[i];
      var start = ui.startBit;
      var count = ui.numBits;
      if (this.position_encoded) {
        start <<= 1;
        count <<= 1;
      }
      for (var j = 0;j < count;++j) {
        var bit = start + j;
        var dist = Math.abs(bit - matchBit);
        if (dist < closestDist || closestBit < 0) {
          closestBit = bit;
          closestDist = dist;
        }
      }
    }
    return closestBit;
  };
  this.getQubitIntMenuArray = function() {
    var returnVal = [];
    for (var key in this.qInts) {
      var qint = this.qInts[key];
      returnVal.push(new Option(qint.name, qint.name));
    }
    return returnVal;
  };
  this.getNamedQubitInt = function(name) {
    for (var key in this.qInts) {
      var qint = this.qInts[key];
      if (qint.name == name) {
        return qint;
      }
    }
    return null;
  };
  this.getQubitIntName = function(bit) {
    if (this.position_encoded) {
      bit >>= 1;
    }
    for (var key in this.qInts) {
      var qint = this.qInts[key];
      var intBit = bit - qint.startBit;
      if (intBit >= 0 && intBit < qint.numBits) {
        return qint.name;
      }
    }
    return "";
  };
  this.getQubitIntPlace = function(bit) {
    var plus_minus = "";
    if (this.position_encoded) {
      plus_minus = bit & 1 ? " - " : " +";
      bit >>= 1;
    }
    for (var key in this.qInts) {
      var qint = this.qInts[key];
      var intBit = bit - qint.startBit;
      if (intBit >= 0 && intBit < qint.numBits) {
        return (1 << intBit).toString(16) + plus_minus;
      }
    }
    return bitfieldHexString(newShiftedMask(1, bit)) + plus_minus;
  };
  this.removeAllQInts = function() {
    for (var key in this.qInts) {
      this.qInts[key].release();
      delete this.qInts[key];
    }
    this.qInts = new Array;
    this.utilityInts = new Array;
    this.qIntsChanged();
  };
  this.qIntsChanged = function() {
    for (var i = 0;i < this.widgets.length;++i) {
      if (this.widgets[i].qIntsChanged) {
        this.widgets[i].qIntsChanged();
      }
    }
  };
  this.deactivate = function() {
    if (this.active) {
      for (var key in this.qInts) {
        this.qInts[key].release();
      }
      this.active = false;
      this.storage.destruct();
      delete this.storage;
      this.storage = null;
      this.invalidateAllClassicalBits();
      if (typeof CollectGarbage == "function") {
        CollectGarbage();
      }
    }
  };
  this.isActive = function() {
    return this.active;
  };
  this.bytesRequired = function() {
    return this.numValues * this.bytesPerFloat * 2;
  };
  this.reserveBits = function(numBits) {
    var startBit = 0;
    var span = 0;
    while (startBit + numBits <= this.numQubits) {
      for (var span = 0;span < numBits && !this.reservedBits[startBit + span];++span) {
      }
      if (span == numBits) {
        for (var i = 0;i < numBits;++i) {
          this.reservedBits[startBit + i] = true;
        }
        return startBit;
      }
      startBit++;
    }
    return -1;
  };
  this.releaseBits = function(numBits, startBit) {
    for (var i = 0;i < numBits;++i) {
      this.reservedBits[startBit + i] = false;
    }
  };
  this.peekAllValues = function() {
    if (!this.active) {
      return null;
    }
    return this.values;
  };
  this.changed = function() {
    if (!this.animateWidgets || qc_options && qc_options.speed_is_priority) {
      return;
    }
    for (var i = 0;i < this.widgets.length;++i) {
      this.widgets[i].changed();
    }
  };
  this.forceChanged = function() {
    for (var i = 0;i < this.widgets.length;++i) {
      this.widgets[i].changed();
    }
  };
  this.message = function(msg, bitMask, arg1) {
    for (var i = 0;i < this.widgets.length;++i) {
      this.widgets[i].message(msg, bitMask, arg1);
    }
  };
  this.invalidateClassicalBits = function(mask, condition) {
    if (mask == null) {
      mask = this.allBitsMask;
    }
    mask = bitFieldToInt(mask);
    if (condition) {
      var cond = bitFieldToInt(condition);
      if ((cond & this.classicalBitsValid) == cond) {
        return;
      }
    }
    this.classicalBitsValid &= ~mask;
  };
  this.debugCheckClassicalBitsValidity = function(reportSuccessAlso) {
    var mask = bitFieldToInt(this.allBitsMask);
    var bit = 1;
    var badBits = 0;
    while (bit & mask) {
      if (bit & this.classicalBitsValid) {
        var actual = this.peekQubitProbability(bit);
        if (bit & this.classicalBits) {
          if (actual < .9999) {
            badBits |= bit;
          }
        } else {
          if (actual != 0) {
            badBits |= bit;
          }
        }
      }
      bit <<= 1;
    }
    if (badBits) {
      console.log("================ Invalid Classical bit(s) " + badBits + " ====================");
      crash.here();
    } else {
      if (reportSuccessAlso) {
        console.log("================ Classical bits ok " + this.classicalBitsValid + " " + this.classicalBits + " ====================");
      }
    }
  };
  this.invalidateAllClassicalBits = function() {
    this.invalidateClassicalBits(this.allBitsMask);
  };
  this.setClassicalBits = function(mask, values) {
    mask = bitFieldToInt(mask);
    values = bitFieldToInt(values);
    this.classicalBitsValid |= mask;
    this.classicalBits &= ~mask;
    this.classicalBits |= values & mask;
  };
  this.setAllClassicalBits = function(values) {
    this.setClassicalBits(this.allBitsMask, values);
  };
  this.classicalBit = function(bitMask) {
    return (this.classicalBits & bitMask) != 0;
  };
  this.classicalBitValid = function(bitMask) {
    return (this.classicalBitsValid & bitMask) != 0;
  };
  this.toggleCat = function() {
    this.catVisible = !this.catVisible;
    this.changed();
  };
  this.active = false;
  this.storage = null;
  this.qInts = new Array;
  this.utilityInts = new Array;
  this.classicalBits = 0;
  this.classicalBitsValid = 0;
  this.currentInstruction = null;
  this.widgets = new Array;
  this.catVisible = false;
  this.setSize(numQubits, numBlockQubits, doublePrecision);
}
;function QInt(numBits, qReg, name) {
  if (numBits == 0) {
    return null;
  }
  numBits = 0 | numBits;
  this.valid = false;
  this.numBits = numBits;
  this.qReg = qReg;
  this.isUtil = false;
  if (name == "(util)") {
    this.isUtil = true;
    qReg.utilityInts.push(this);
  }
  qReg.qInts.push(this);
  this.name = name;
  this.isUtil = false;
  this.isQInt = true;
  this.reserve = function() {
    if (!this.valid) {
      this.startBit = qReg.reserveBits(this.numBits);
      if (this.startBit >= 0) {
        this.baseMask = 0;
        for (var i = 0;i < this.numBits;++i) {
          this.baseMask |= 1 << i;
        }
        this.mask = this.baseMask << this.startBit;
        this.maskBF = newShiftedMask(this.baseMask, this.startBit);
        this.valid = true;
      }
    }
    this.qReg.qIntsChanged();
  };
  this.release = function() {
    if (this.valid) {
      this.valid = false;
      this.qReg.releaseBits(this.numBits);
    }
  };
  this.getValueProbability = function(value) {
    if (this.valid) {
      var regValue = value << this.startBit;
      var qx = this.qReg.vector[0][regValue];
      var qy = this.qReg.vector[1][regValue];
      return qx * qx + qy * qy;
    }
    return 0;
  };
  this.getValuePhaseRadians = function(value) {
    if (this.valid) {
      var regValue = value << this.startBit;
      var qx = this.qReg.vector[0][regValue];
      var qy = this.qReg.vector[1][regValue];
      return Math.atan2(qy, qx);
    }
    return 0;
  };
  this.peekComplexValue = function(value) {
    if (this.valid) {
      var regValue = value << this.startBit;
      return this.qReg.peekComplexValue(regValue);
    }
    return 0;
  };
  this.peekProbability = function(value, cval_array) {
    if (this.valid) {
      var regValue = value << this.startBit;
      var bitsBelow = this.startBit;
      var bitsAbove = this.qReg.numQubits - (this.startBit + this.numBits);
      var probability = 0;
      for (below = 0;below < 1 << bitsBelow;++below) {
        for (above = 0;above < 1 << bitsAbove;++above) {
          var checkValue = regValue | below | above << this.startBit + this.numBits;
          var complexValue = this.qReg.peekComplexValue(checkValue);
          var prob = complexValue.x * complexValue.x + complexValue.y * complexValue.y;
          probability += prob;
          if (cval_array && prob > 1E-6) {
            cval_array.push(complexValue);
          }
        }
      }
      return probability;
    }
    return 0;
  };
  this.printProbabilities = function(message, start, count) {
    if (message == null) {
      message = "";
    }
    if (start == null) {
      start = 0;
    }
    if (count == null) {
      count = 1 << this.numBits;
    }
    var str = "" + this.name + ": " + message + " ";
    for (var i = start;i < count;++i) {
      var val = this.peekProbability(i);
      if (val != 0) {
        str += "[" + i + "]=" + val.toFixed(6) + " ";
      }
    }
    console.log(str);
  };
  this.peekHighestProbability = function(start, count) {
    if (start == null) {
      start = 0;
    }
    if (count == null) {
      count = 1 << this.numBits;
    }
    var best_val = start;
    var best_prob = 0;
    for (var i = start;i < count;++i) {
      var prob = this.peekProbability(i);
      if (prob > best_prob) {
        best_prob = prob;
        best_val = i;
      }
    }
    return best_val;
  };
  this.cnot_core = function(op, conditionInt, mask, extraConditionBits, extraNOTConditionBits) {
    if (conditionInt && conditionInt.isBitField) {
      extraConditionBits = conditionInt;
      conditionInt = null;
    }
    var anim = this.qReg.animateWidgets;
    if (extraNOTConditionBits) {
      if (anim) {
        this.qReg.staff.addInstructionAfterInsertionPoint("not", extraNOTConditionBits, 0, 0);
      } else {
        this.qReg.not(extraNOTConditionBits);
      }
    }
    var condition = NewBitField(0, this.qReg.numQubits);
    var baseTarget = mask == null ? this.baseMask : this.baseMask & mask;
    if (!conditionInt) {
      condition.set(0);
      condition.orEquals(extraConditionBits);
      condition.orEquals(extraNOTConditionBits);
      var bt = qintMask([this, baseTarget]);
      if (anim) {
        this.qReg.staff.addInstructionAfterInsertionPoint("cnot", bt, condition, 0);
      } else {
        this.qReg.cnot(bt, condition);
      }
      bt.recycle();
    } else {
      var target = NewBitField(0, this.qReg.numQubits);
      var bits = this.numBits;
      if (conditionInt && conditionInt.numBits < bits) {
        bits = conditionInt.numBits;
      }
      for (var i = 0;i < bits;++i) {
        if (baseTarget & 1 << i) {
          target.set(0);
          target.setBits(i + this.startBit, 1, 1);
          condition.set(0);
          if (conditionInt) {
            condition.setBits(i + conditionInt.startBit, 1, 1);
          }
          condition.orEquals(extraConditionBits);
          condition.orEquals(extraNOTConditionBits);
          if (anim) {
            this.qReg.staff.addInstructionAfterInsertionPoint(op, target, condition, 0);
          } else {
            if (op == "cnot") {
              this.qReg.cnot(target, condition);
            } else {
              if (op == "crootnot") {
                this.qReg.crootnot(target, condition);
              } else {
                if (op == "crootnot_inv") {
                  this.qReg.crootnot_inv(target, condition);
                }
              }
            }
          }
        }
      }
      target.recycle();
    }
    condition.recycle();
    if (extraNOTConditionBits) {
      if (anim) {
        this.qReg.staff.addInstructionAfterInsertionPoint("not", extraNOTConditionBits, 0, 0);
      } else {
        this.qReg.not(extraNOTConditionBits);
      }
    }
  };
  this.not = function(mask) {
    this.cnot_core("cnot", null, mask, null, null);
  };
  this.cnot = function(conditionInt, mask, extraConditionBits, extraNOTConditionBits) {
    this.cnot_core("cnot", conditionInt, mask, extraConditionBits, extraNOTConditionBits);
  };
  this.rootnot = function(mask) {
    this.cnot_core("crootnot", null, mask, null, null);
  };
  this.crootnot = function(conditionInt, mask, extraConditionBits, extraNOTConditionBits) {
    this.cnot_core("crootnot", conditionInt, mask, extraConditionBits, extraNOTConditionBits);
  };
  this.rootnot_inv = function(mask) {
    this.cnot_core("crootnot_inv", null, mask, null, null);
  };
  this.crootnot_inv = function(conditionInt, mask, extraConditionBits, extraNOTConditionBits) {
    this.cnot_core("crootnot_inv", conditionInt, mask, extraConditionBits, extraNOTConditionBits);
  };
  this.exchange_core = function(op, swapInt, baseMask, extraConditionBits, extraNOTConditionBits) {
    if (extraConditionBits && extraConditionBits.isQInt) {
      extraConditionBits = extraConditionBits.maskBF;
    }
    if (extraNOTConditionBits && extraNOTConditionBits.isQInt) {
      extraNOTConditionBits = extraNOTConditionBits.maskBF;
    }
    if (extraNOTConditionBits) {
      this.qReg.staff.addInstructionAfterInsertionPoint("not", extraNOTConditionBits, 0, 0);
    }
    if (baseMask == null) {
      baseMask = this.baseMask;
    }
    var conditionMask = 0;
    if (!(isAllZero(extraConditionBits) && isAllZero(extraNOTConditionBits))) {
      if (conditionMask) {
        conditionMask = NewBitField(extraConditionBits);
        conditionMask.orEquals(extraNOTConditionBits);
      } else {
        conditionMask = NewBitField(extraNOTConditionBits);
        conditionMask.orEquals(extraConditionBits);
      }
    }
    var bits = this.numBits;
    targetBits = NewBitField(0, this.qReg.numQubits);
    if (swapInt == null || swapInt == this) {
      targetBits.set(0);
      for (var i = 0;i < bits;++i) {
        if (baseMask & 1 << i) {
          targetBits.setBit(i + this.startBit, 1);
        }
      }
      this.qReg.staff.addInstructionAfterInsertionPoint(op, targetBits, conditionMask, 0);
    } else {
      if (swapInt.numBits < bits) {
        bits = swapInt.numBits;
      }
      for (var i = 0;i < bits;++i) {
        if (baseMask & 1 << i) {
          targetBits.set(0);
          targetBits.setBit(i + this.startBit, 1);
          targetBits.setBit(i + swapInt.startBit, 1);
          this.qReg.staff.addInstructionAfterInsertionPoint(op, targetBits, conditionMask, 0);
        }
      }
    }
    if (extraNOTConditionBits) {
      this.qReg.staff.addInstructionAfterInsertionPoint("not", extraNOTConditionBits, 0, 0);
    }
  };
  this.exchange = function(swapInt, baseMask, extraConditionBits, extraNOTConditionBits) {
    this.exchange_core("exchange", swapInt, baseMask, extraConditionBits, extraNOTConditionBits);
  };
  this.rootexchange = function(swapInt, baseMask, extraConditionBits, extraNOTConditionBits) {
    this.exchange_core("rootexchange", swapInt, baseMask, extraConditionBits, extraNOTConditionBits);
  };
  this.rootexchange_inv = function(swapInt, baseMask, extraConditionBits, extraNOTConditionBits) {
    this.exchange_core("rootexchange_inv", swapInt, baseMask, extraConditionBits, extraNOTConditionBits);
  };
  this.hadamard = function(mask, extraConditionBits) {
    var baseTarget = mask == null ? this.baseMask : this.baseMask & mask;
    var target = newShiftedMask(baseTarget, this.startBit);
    this.qReg.staff.addInstructionAfterInsertionPoint("hadamard", target, extraConditionBits);
  };
  this.had = this.hadamard;
  this.chadamard = function(conditionInt, mask, extraConditionBits, extraNOTConditionBits) {
    if (extraNOTConditionBits) {
      this.qReg.staff.addInstructionAfterInsertionPoint("not", extraNOTConditionBits, 0, 0);
    }
    var condition = NewBitField(0, this.qReg.numQubits);
    var baseTarget = mask == null ? this.baseMask : this.baseMask & mask;
    if (!conditionInt) {
      condition.set(0);
      condition.orEquals(extraConditionBits);
      condition.orEquals(extraNOTConditionBits);
      var bt = qintMask([this, baseTarget]);
      this.qReg.staff.addInstructionAfterInsertionPoint("chadamard", bt, condition, 0);
      bt.recycle();
    } else {
      var target = NewBitField(0, this.qReg.numQubits);
      var bits = this.numBits;
      if (conditionInt && conditionInt.numBits < bits) {
        bits = conditionInt.numBits;
      }
      for (var i = 0;i < bits;++i) {
        if (baseTarget & 1 << i) {
          target.set(0);
          target.setBits(i + this.startBit, 1, 1);
          condition.set(0);
          if (conditionInt) {
            condition.setBits(i + conditionInt.startBit, 1, 1);
          }
          condition.orEquals(extraConditionBits);
          condition.orEquals(extraNOTConditionBits);
          this.qReg.staff.addInstructionAfterInsertionPoint("chadamard", target, condition, 0);
        }
      }
    }
    if (extraNOTConditionBits) {
      this.qReg.staff.addInstructionAfterInsertionPoint("not", extraNOTConditionBits, 0, 0);
    }
  };
  this.beamsplitter = function(reflectivity, mask) {
    if (reflectivity == null) {
      reflectivity = .5;
    }
    var baseTarget = mask == null ? this.baseMask : this.baseMask & mask;
    var target = newShiftedMask(baseTarget, this.startBit);
    this.qReg.staff.addInstructionAfterInsertionPoint("optical_beamsplitter", target, null, reflectivity);
  };
  this.dual_rail_beamsplitter = function(reflectivity, mask) {
    if (reflectivity == null) {
      reflectivity = .5;
    }
    var baseTarget = mask == null ? this.baseMask : this.baseMask & mask;
    var target = newShiftedMask(baseTarget, this.startBit);
    this.qReg.staff.addInstructionAfterInsertionPoint("dual_rail_beamsplitter", target, null, reflectivity);
  };
  this.postselect_qubit_pair = function(mask) {
    var baseTarget = mask == null ? this.baseMask : this.baseMask & mask;
    var target = null;
    if (mask && mask.isQInt) {
      target = newShiftedMask(1, this.startBit);
      target.setBit(mask.startBit, 1);
    } else {
      target = newShiftedMask(baseTarget, this.startBit);
    }
    this.qReg.staff.addInstructionAfterInsertionPoint("postselect_qubit_pair", target);
  };
  this.pair_source = function(mask) {
    if (mask.isQInt) {
      return this.cnot_core("pair_source", mask, null, null, null);
    }
    var baseTarget = mask == null ? this.baseMask : this.baseMask & mask;
    var target = newShiftedMask(baseTarget, this.startBit);
    this.qReg.staff.addInstructionAfterInsertionPoint("pair_source", target, null, 0);
  };
  this.polarization_grating_in = function(mask, theta) {
    if (theta == null) {
      theta = 0;
    }
    var baseTarget = mask == null ? this.baseMask : this.baseMask & mask;
    var target = newShiftedMask(baseTarget, this.startBit);
    this.qReg.staff.addInstructionAfterInsertionPoint("polarization_grating_in", target, null, theta);
  };
  this.polarization_grating_out = function(mask, theta) {
    if (theta == null) {
      theta = 0;
    }
    var baseTarget = mask == null ? this.baseMask : this.baseMask & mask;
    var target = newShiftedMask(baseTarget, this.startBit);
    this.qReg.staff.addInstructionAfterInsertionPoint("polarization_grating_out", target, null, theta);
  };
  this.phaseShift = function(thetaDegrees, mask, extraConditionBits, extraNOTConditionBits) {
    if (extraConditionBits && extraConditionBits.isQInt) {
      extraConditionBits = extraConditionBits.maskBF;
    }
    if (extraNOTConditionBits && extraNOTConditionBits.isQInt) {
      extraNOTConditionBits = extraNOTConditionBits.maskBF;
    }
    var baseCondition = mask == null ? this.baseMask : this.baseMask & mask;
    var condition = newShiftedMask(baseCondition, this.startBit);
    if (extraNOTConditionBits) {
      this.qReg.staff.addInstructionAfterInsertionPoint("not", extraNOTConditionBits, 0, 0);
    }
    condition.orEquals(extraConditionBits);
    condition.orEquals(extraNOTConditionBits);
    this.qReg.staff.addInstructionAfterInsertionPoint("phase", 0, condition, thetaDegrees);
    if (extraNOTConditionBits) {
      this.qReg.staff.addInstructionAfterInsertionPoint("not", extraNOTConditionBits, 0, 0);
    }
  };
  this.phase = this.phaseShift;
  this.cz = function(conditionInt, mask, extraConditionBits, extraNOTConditionBits) {
    var cond = conditionInt.bits();
    cond.orEquals(extraConditionBits);
    this.phase(180, mask, cond, extraNOTConditionBits);
  };
  this.rotatex = function(thetaDegrees, mask, cond) {
    if (mask && mask.isQInt) {
      cond = mask.maskBF;
      mask = null;
    }
    var baseTarget = mask == null ? this.baseMask : this.baseMask & mask;
    var target = newShiftedMask(baseTarget, this.startBit);
    this.qReg.staff.addInstructionAfterInsertionPoint("crotatex", target, cond, thetaDegrees);
  };
  this.rotatey = function(thetaDegrees, mask, cond) {
    if (mask && mask.isQInt) {
      cond = mask.maskBF;
      mask = null;
    }
    var baseTarget = mask == null ? this.baseMask : this.baseMask & mask;
    var target = newShiftedMask(baseTarget, this.startBit);
    this.qReg.staff.addInstructionAfterInsertionPoint("crotatey", target, cond, thetaDegrees);
  };
  this.rotatez = function(thetaDegrees, mask, cond) {
    if (mask && mask.isQInt) {
      cond = mask.maskBF;
      mask = null;
    }
    var baseTarget = mask == null ? this.baseMask : this.baseMask & mask;
    var target = newShiftedMask(baseTarget, this.startBit);
    target.orEquals(cond);
    this.qReg.staff.addInstructionAfterInsertionPoint("phase", null, target, thetaDegrees);
  };
  this.rotate = this.rotatex;
  this.rotx = this.rotatex;
  this.roty = this.rotatey;
  this.rotz = this.rotatez;
  this.teleport_send = function(entangle_qubit) {
    entangle_qubit.cnot(this);
    this.hadamard();
    var bits = [this.read(), entangle_qubit.read()];
    return bits;
  };
  this.teleport_receive = function(send_bits) {
    this.not(send_bits[0]);
    this.hadamard();
    this.not(send_bits[1]);
    this.hadamard();
  };
  this.read = function(mask) {
    var baseTarget = mask == null ? this.baseMask : this.baseMask & mask;
    var target = newShiftedMask(baseTarget, this.startBit);
    if (this.qReg.animateWidgets) {
      var instruction = this.qReg.staff.addInstructionAfterInsertionPoint("read", target, 0, 0);
      if (instruction) {
        instruction.finish();
      }
    }
    var rval = intToBitField(this.qReg.read(target));
    var result = rval.getBits(this.startBit, baseTarget);
    target.recycle();
    rval.recycle();
    return result;
  };
  this.postselect = function(value, mask) {
    var baseTarget = mask == null ? this.baseMask : this.baseMask & mask;
    var target = newShiftedMask(baseTarget, this.startBit);
    if (this.qReg.animateWidgets) {
      var instruction = this.qReg.staff.addInstructionAfterInsertionPoint("postselect", target, value, 0);
      if (instruction) {
        instruction.finish();
      }
    } else {
      this.qReg.postselect(target, value);
    }
  };
  this.peek = function(mask) {
    var baseTarget = mask == null ? this.baseMask : this.baseMask & mask;
    var target = newShiftedMask(baseTarget, this.startBit);
    var instruction = this.qReg.staff.addInstructionAfterInsertionPoint("peek", target, 0, 0);
    if (instruction) {
      instruction.finish();
    }
  };
  this.discard = function(mask) {
    var baseTarget = mask == null ? this.baseMask : this.baseMask & mask;
    var target = newShiftedMask(baseTarget, this.startBit);
    var instruction = this.qReg.staff.addInstructionAfterInsertionPoint("discard", target, 0, 0);
    if (instruction) {
      instruction.finish();
    }
  };
  this.nop = function(mask) {
    var baseTarget = mask == null ? this.baseMask : this.baseMask & mask;
    var target = newShiftedMask(baseTarget, this.startBit);
    var instruction = this.qReg.staff.addInstructionAfterInsertionPoint("nop", target, 0, 0);
    if (instruction) {
      instruction.finish();
    }
  };
  this.bits = function(mask, or_with_next) {
    var baseTarget = mask == null ? this.baseMask : this.baseMask & mask;
    var out_mask = newShiftedMask(baseTarget, this.startBit);
    if (or_with_next) {
      out_mask.orEquals(or_with_next);
    }
    return out_mask;
  };
  this.readSigned = function() {
    var rval = this.read();
    rval <<= 32 - this.numBits;
    rval >>= 32 - this.numBits;
    return rval;
  };
  this.write = function(value, mask) {
    var baseTarget = mask == null ? this.baseMask : this.baseMask & mask;
    if (this.shiftedMask == null) {
      this.shiftedMask = newShiftedMask(baseTarget, this.startBit);
    }
    if (this.shiftedValue == null) {
      this.shiftedValue = newShiftedMask(value, this.startBit);
    }
    this.shiftedMask.set(0);
    this.shiftedMask.setBits(this.startBit, baseTarget, baseTarget);
    this.shiftedValue.set(0);
    this.shiftedValue.setBits(this.startBit, value, value);
    if (this.qReg.animateWidgets) {
      this.qReg.staff.addInstructionAfterInsertionPoint("write", this.shiftedMask, this.shiftedValue, 0);
    } else {
      this.qReg.write(this.shiftedMask, this.shiftedValue);
    }
  };
  this.invQFT_test2 = function() {
    for (bit1 = 0;bit1 < this.numBits;++bit1) {
      var mask1 = 1 << bit1;
      var theta = -90;
      for (bit2 = bit1 + 1;bit2 < this.numBits - 1;++bit2) {
        theta *= .5;
      }
      this.hadamard(mask1);
      for (bit2 = bit1 + 1;bit2 < this.numBits;++bit2) {
        var mask2 = 1 << bit2;
        this.phaseShift(theta, mask1 + mask2);
        theta *= 2;
      }
    }
  };
  this.invQFT_test1 = function() {
    for (bit1 = this.numBits - 1;bit1 >= 0;--bit1) {
      var mask1 = 1 << bit1;
      var theta = 90;
      for (bit2 = this.numBits - 1;bit2 >= bit1 + 1;--bit2) {
        var mask2 = 1 << bit2;
        this.phaseShift(theta, mask1 + mask2);
        theta *= .5;
      }
      this.hadamard(mask1);
    }
  };
  this.invQFT = function() {
    var bits = this.numBits;
    for (var i = 0;i < bits;++i) {
      var bit1 = bits - (i + 1);
      var mask1 = 1 << bit1;
      this.hadamard(mask1);
      var theta = -90;
      for (var j = i + 1;j < bits;++j) {
        var bit2 = bits - (j + 1);
        var mask2 = 1 << bit2;
        this.phaseShift(theta, mask1 + mask2);
        theta *= .5;
      }
    }
  };
  this.QFT = function() {
    for (bit1 = 0;bit1 < this.numBits;++bit1) {
      var mask1 = 1 << bit1;
      var theta = 90;
      this.hadamard(mask1);
      for (bit2 = bit1 + 1;bit2 < this.numBits;++bit2) {
        var mask2 = 1 << bit2;
        this.phaseShift(theta, mask1 + mask2);
        theta *= .5;
      }
    }
  };
  this.Grover = function(conditionMask) {
    this.hadamard();
    this.not();
    this.phase(180, ~0, conditionMask);
    this.not();
    this.hadamard();
  };
  this.add = function(rhs, extraConditionBits, extraNOTConditionBits, reverse_to_subtract, shiftRHS) {
    var anim = this.qReg.animateWidgets;
    if (!shiftRHS) {
      shiftRHS = 0;
    }
    if (rhs.toFixed) {
      return this.add_int(rhs << shiftRHS, extraConditionBits, extraNOTConditionBits);
    }
    if (extraNOTConditionBits) {
      if (anim) {
        this.qReg.staff.addInstructionAfterInsertionPoint("not", extraNOTConditionBits, 0, 0);
      } else {
        this.qReg.not(extraNOTConditionBits);
      }
    }
    if (this.add_instructions == null) {
      this.add_instructions = [];
    }
    if (this.add_bf != null && this.add_bf.length > 0 && this.add_bf[0].numBits < this.qReg.numQubits) {
      this.add_bf = null;
    }
    if (this.add_bf == null) {
      this.add_bf = [];
    }
    var instructions = [];
    if (this.slideMask == null) {
      this.slideMask = NewBitField(this.maskBF, this.qReg.numQubits);
    }
    if (this.shiftStrip == null) {
      this.shiftStrip = NewBitField(this.slideMask);
    }
    this.slideMask.set(this.maskBF);
    this.shiftStrip.set(this.maskBF);
    for (var i = 0;i < shiftRHS;++i) {
      this.shiftStrip.shiftLeft1();
    }
    this.shiftStrip.andEquals(this.slideMask);
    if (this.aCond == null) {
      this.aCond = NewBitField(this.slideMask);
    }
    if (this.aTarg == null) {
      this.aTarg = NewBitField(this.slideMask);
    }
    if (this.condArg == null) {
      this.condArg = NewBitField(this.slideMask);
    }
    if (this.bCond == null) {
      this.bCond = NewBitField(0, this.qReg.numQubits);
    }
    this.bCond.set(0);
    this.bCond.setBit(rhs.startBit, 1);
    var shiftWait = 0;
    while (this.bCond.andIsNotEqualZero(rhs.maskBF)) {
      this.aTarg.set(0);
      this.aTarg.setBit(this.startBit + (this.numBits - 1), 1);
      this.aCond.set(this.slideMask);
      this.aCond.shiftRight1();
      while (this.aTarg.andIsNotEqualZero(this.slideMask) && this.aTarg.andIsNotEqualZero(this.shiftStrip)) {
        this.condArg.set(this.aCond);
        this.condArg.andEquals(this.slideMask);
        this.condArg.andEquals(this.shiftStrip);
        this.condArg.orEquals(extraConditionBits);
        this.condArg.orEquals(extraNOTConditionBits);
        this.condArg.orEquals(this.bCond);
        if (instructions.length == this.add_instructions.length) {
          var inst = new QInstruction("cnot", this.aTarg, this.condArg, 0, null);
          this.add_instructions.push(inst);
          instructions.push(inst);
        } else {
          var inst = this.add_instructions[instructions.length];
          inst.targetQubits.set(this.aTarg);
          inst.conditionQubits.set(this.condArg);
          instructions.push(inst);
        }
        this.aCond.shiftRight1();
        this.aTarg.shiftRight1();
      }
      this.bCond.shiftLeft1();
      this.slideMask.shiftLeft1();
      this.slideMask.andEquals(this.maskBF);
      this.shiftStrip.shiftLeft1();
      this.shiftStrip.andEquals(this.maskBF);
    }
    if (reverse_to_subtract) {
      if (anim) {
        for (var i = instructions.length - 1;i >= 0;--i) {
          this.qReg.staff.addInstructionAfterInsertionPoint(instructions[i]);
        }
      } else {
        for (var i = instructions.length - 1;i >= 0;--i) {
          this.qReg.cnot(instructions[i].targetQubits, instructions[i].conditionQubits);
        }
      }
    } else {
      if (anim) {
        for (var i = 0;i < instructions.length;++i) {
          this.qReg.staff.addInstructionAfterInsertionPoint(instructions[i]);
        }
      } else {
        for (var i = 0;i < instructions.length;++i) {
          this.qReg.cnot(instructions[i].targetQubits, instructions[i].conditionQubits);
        }
      }
    }
    if (extraNOTConditionBits) {
      if (anim) {
        this.qReg.staff.addInstructionAfterInsertionPoint("not", extraNOTConditionBits, 0, 0);
      } else {
        this.qReg.not(extraNOTConditionBits);
      }
    }
  };
  this.addShifted = function(rhs, shiftRHS, extraConditionBits, extraNOTConditionBits, reverse_to_subtract) {
    this.add(rhs, extraConditionBits, extraNOTConditionBits, reverse_to_subtract, shiftRHS);
  };
  this.addSquared = function(rhs, extraConditionBits, extraNOTConditionBits, reverse_to_subtract) {
    if (rhs.toFixed) {
      return this.add_int(rhs * rhs, extraConditionBits, extraNOTConditionBits);
    }
    var slideMask = NewBitField(0, this.qReg.numQubits);
    for (var bit = 0;bit < rhs.numBits;++bit) {
      slideMask.set(0);
      if (extraConditionBits) {
        slideMask.orEquals(extraConditionBits);
      }
      slideMask.setBit(rhs.startBit + bit, 1);
      this.add(rhs, slideMask, extraNOTConditionBits, reverse_to_subtract, bit);
      slideMask.shiftLeft1();
    }
  };
  this.reverseBits = function(extraConditionBits) {
    var mask = this.bits(0);
    var iters = Math.floor(this.numBits / 2);
    for (var i = 0;i < iters;++i) {
      mask.set(0);
      mask.setBit(this.startBit + i, 1);
      mask.setBit(this.startBit + this.numBits - (i + 1), 1);
      this.qReg.staff.addInstructionAfterInsertionPoint("exchange", mask, extraConditionBits);
    }
  };
  this.rollLeft = function(shift, extraConditionBits, extraNOTConditionBits) {
    shift %= this.numBits;
    if (shift == 0) {
      return;
    }
    var bit0 = 0;
    var bit1 = shift;
    var mask = this.bits(0);
    for (var s = 0;s < shift;++s) {
      for (var i = this.numBits - 2;i >= 0;--i) {
        mask.set(0);
        mask.setBit(this.startBit + (i + 0) % this.numBits, 1);
        mask.setBit(this.startBit + (i + 1) % this.numBits, 1);
        this.qReg.staff.addInstructionAfterInsertionPoint("exchange", mask, extraConditionBits);
      }
    }
  };
  this.subtractShifted = function(rhs, shiftRHS, extraConditionBits, extraNOTConditionBits, reverse_to_subtract) {
    if (rhs.toFixed) {
      return this.add_int(-(rhs << shiftRHS), extraConditionBits, extraNOTConditionBits);
    }
    this.addShifted(rhs, shiftRHS, extraConditionBits, extraNOTConditionBits, true);
  };
  this.subtractSquared = function(rhs, extraConditionBits, extraNOTConditionBits, reverse_to_subtract) {
    if (rhs.toFixed) {
      return this.add_int(-(rhs * rhs), extraConditionBits, extraNOTConditionBits);
    }
    this.addSquared(rhs, extraConditionBits, extraNOTConditionBits, true);
  };
  this.negate = function() {
    this.not();
    this.add(1);
  };
  this.subtract = function(rhs, extraConditionBits, extraNOTConditionBits) {
    if (rhs.toFixed) {
      return this.add_int(-rhs, extraConditionBits, extraNOTConditionBits);
    }
    this.add(rhs, extraConditionBits, extraNOTConditionBits, true);
  };
  this.add_int = function(rhs, extraConditionBits, extraNOTConditionBits) {
    var anim = this.qReg.animateWidgets;
    var reverse = false;
    if (this.numBits > 1 && rhs & 1 << this.numBits - 1) {
      reverse = true;
      rhs = -rhs & this.baseMask;
    }
    var instructions = [];
    if (this.add_instructions == null) {
      this.add_instructions = [];
    }
    if (extraNOTConditionBits) {
      if (anim) {
        this.qReg.staff.addInstructionAfterInsertionPoint("not", extraNOTConditionBits, 0, 0);
      } else {
        this.qReg.not(extraNOTConditionBits);
      }
    }
    rhs = 0 | rhs;
    var rhs_mask = 0;
    while (rhs & ~rhs_mask) {
      rhs_mask = rhs_mask << 1 | 1;
    }
    rhs_mask &= this.baseMask;
    if (this.slideMask == null) {
      this.slideMask = NewBitField(this.maskBF, this.qReg.numQubits);
    }
    if (this.aCond == null) {
      this.aCond = NewBitField(this.slideMask);
    }
    if (this.aTarg == null) {
      this.aTarg = NewBitField(this.slideMask);
    }
    if (this.condArg == null) {
      this.condArg = NewBitField(this.slideMask);
    }
    this.slideMask.set(this.maskBF);
    var bCond = 1;
    while (bCond & rhs_mask) {
      this.aTarg.set(0);
      this.aTarg.setBit(this.startBit + (this.numBits - 1), 1);
      this.aCond.set(this.slideMask);
      this.aCond.shiftRight1();
      while (this.aTarg.andIsNotEqualZero(this.slideMask)) {
        if (rhs & bCond) {
          this.condArg.set(this.aCond);
          this.condArg.andEquals(this.slideMask);
          this.condArg.orEquals(extraConditionBits);
          this.condArg.orEquals(extraNOTConditionBits);
          if (instructions.length == this.add_instructions.length) {
            var inst = new QInstruction("cnot", this.aTarg, this.condArg, 0, null);
            this.add_instructions.push(inst);
            instructions.push(inst);
          } else {
            var inst = this.add_instructions[instructions.length];
            inst.targetQubits.set(this.aTarg);
            inst.conditionQubits.set(this.condArg);
            instructions.push(inst);
          }
        }
        this.aCond.shiftRight1();
        this.aTarg.shiftRight1();
      }
      bCond <<= 1;
      this.slideMask.shiftLeft1();
      this.slideMask.andEquals(this.maskBF);
    }
    if (reverse) {
      if (anim) {
        for (var i = instructions.length - 1;i >= 0;--i) {
          this.qReg.staff.addInstructionAfterInsertionPoint(instructions[i]);
        }
      } else {
        for (var i = instructions.length - 1;i >= 0;--i) {
          this.qReg.cnot(instructions[i].targetQubits, instructions[i].conditionQubits);
        }
      }
    } else {
      if (anim) {
        for (var i = 0;i < instructions.length;++i) {
          this.qReg.staff.addInstructionAfterInsertionPoint(instructions[i]);
        }
      } else {
        for (var i = 0;i < instructions.length;++i) {
          this.qReg.cnot(instructions[i].targetQubits, instructions[i].conditionQubits);
        }
      }
    }
    if (extraNOTConditionBits) {
      if (anim) {
        this.qReg.staff.addInstructionAfterInsertionPoint("not", extraNOTConditionBits, 0, 0);
      } else {
        this.qReg.not(extraNOTConditionBits);
      }
    }
  };
  this.reserve();
}
function qintMask(list) {
  var numBits = 1;
  if (list[0]) {
    numBits = list[0].qReg.numQubits;
  }
  var result = NewBitField(0, numBits);
  for (var index = 0;index < list.length;index += 2) {
    var qint = list[index];
    if (qint) {
      var mask = list[index + 1];
      result.orEquals(qint.bits(mask));
    }
  }
  return result;
}
;QReg.prototype.not = function(targetQubits) {
  if (this.current_mix) {
    for (var m = 0;m < this.mixed_states.length;++m) {
      var mix = this.mixed_states[m];
      mix.reg.not(targetQubits);
    }
    this.mergeMixedStates();
    this.changed();
    return;
  }
  if (targetQubits == null) {
    targetQubits = this.allBitsMask;
  }
  if (isAllZero(targetQubits)) {
    return;
  }
  if (this.disableSimulation) {
    this.storage.not(targetQubits);
    this.changed();
    return;
  }
  targetQubits = bitFieldToInt(targetQubits);
  if (printSpeedMetrics) {
    var startTime = (new Date).getTime();
    console.log("NOT start...\n");
  }
  for (var i = 0;i < this.numQubits;++i) {
    var mask = 1 << i;
    if (targetQubits & mask) {
      this.storage.not(mask, this.storage);
    }
  }
  if (printSpeedMetrics) {
    var elapsedTimeMS = (new Date).getTime() - startTime;
    console.log("NOT op time: " + elapsedTimeMS / 1E3 + " seconds.\n");
  }
  this.classicalBits ^= targetQubits;
  this.changed();
};
QRegNode.prototype.not = function(targetQubit) {
  if (targetQubit == 0) {
    return;
  }
  if (targetQubit == this.bitValue) {
    this.swap();
  } else {
    if (targetQubit & this.kidMask) {
      this.tree[0].not(targetQubit);
      this.tree[1].not(targetQubit);
    } else {
      console.log("ERROR: bad condition (1) in NOT gate.");
    }
  }
};
QBlock.prototype.not = function(targetQubit) {
  if (this.qReg.currentInstruction) {
    bj = this.qReg.currentInstruction.nextBlockJob(this, null);
  }
  if (targetQubit == 0) {
    return;
  }
  var vals = 1 << this.numQubits;
  if ((targetQubit & (1 << this.numQubits) - 1) == 0) {
    console.log("ERROR: bad condition (2) in NOT gate.");
    return;
  }
  if (0 && this.qReg.blockNotAsm) {
    this.qReg.blockNotAsm(targetQubit, this.masterArrayStartIndex, this.qReg.numBlockValues);
    return;
  }
  if (0 && this.qReg.bytesPerBlock > 1E5) {
    var rowBytes = targetQubit * 2 * this.qReg.bytesPerFloat;
    var width = rowBytes >> 2;
    var height = this.qReg.bytesPerBlock / rowBytes;
    if (this.qReg.blockCanvas.width != width || this.qReg.blockCanvas.height != height) {
      this.qReg.blockCanvas.width = width;
      this.qReg.blockCanvas.height = height;
      this.qReg.blockCtx = this.qReg.blockCanvas.getContext("2d");
    }
    var array = new Uint8ClampedArray(this.values.buffer);
    return;
  }
  if (this.gpuBlock) {
    this.gpuBlock.op_not(targetQubit);
    if (!webgl_blocks.side_by_side_checking) {
      return;
    }
  }
  var temp;
  var index1;
  var index2;
  var column1 = 0;
  var column2 = column1 + targetQubit;
  while (column1 < vals) {
    for (var j = 0;j < targetQubit;++j) {
      index1 = column1 * 2;
      index2 = column2 * 2;
      temp = this.values[index1];
      this.values[index1] = this.values[index2];
      this.values[index2] = temp;
      temp = this.values[index1 + 1];
      this.values[index1 + 1] = this.values[index2 + 1];
      this.values[index2 + 1] = temp;
      column1++;
      column2++;
    }
    column1 += targetQubit;
    column2 += targetQubit;
  }
  if (this.gpuBlock && webgl_blocks.side_by_side_checking) {
    this.gpuBlock.side_by_side_check("NOT bit" + targetQubit, this.values);
  }
};
function BlockAsmModule(stdlib, foreign, heap) {
  "use asm";
  function not(targetQubit, startIndex, numIndices) {
    var temp;
    var index1;
    var index2;
    var column1 = startIndex;
    var column2 = column1 + targetQubit;
    var endIndex = startIndex + numIndices;
    while (column1 < endIndex) {
      for (var j = 0;j < targetQubit;++j) {
        index1 = column1 * 2;
        index2 = column2 * 2;
        temp = heap[index1];
        heap[index1] = heap[index2];
        heap[index2] = temp;
        temp = heap[index1 + 1];
        heap[index1 + 1] = heap[index2 + 1];
        heap[index2 + 1] = temp;
        column1++;
        column2++;
      }
      column1 += targetQubit;
      column2 += targetQubit;
    }
  }
  return {not:not};
}
QReg.prototype.exchange = function(targetQubits, conditionQubits) {
  if (this.current_mix) {
    for (var m = 0;m < this.mixed_states.length;++m) {
      var mix = this.mixed_states[m];
      mix.reg.exchange(targetQubits, conditionQubits);
    }
    this.mergeMixedStates();
    this.changed();
    return;
  }
  this.invalidateClassicalBits(targetQubits, conditionQubits);
  if (this.use_photon_sim) {
    this.photonSim.exchange(targetQubits);
    this.changed();
    return;
  }
  if (this.chp && this.chp.active) {
  }
  var targetArray = makeBitArray(targetQubits, 2);
  var target1 = new BitField(targetQubits);
  var target2 = new BitField(targetQubits);
  target1.setBit(targetArray[0], 0);
  target2.setBit(targetArray[1], 0);
  var cond1 = new BitField(target2);
  var cond2 = new BitField(target1);
  cond1.orEquals(conditionQubits);
  cond2.orEquals(conditionQubits);
  this.cnot(target1, cond1);
  this.cnot(target2, cond2);
  this.cnot(target1, cond1);
};
QReg.prototype.rootexchange = function(targetQubits, conditionQubits) {
  if (this.current_mix) {
    for (var m = 0;m < this.mixed_states.length;++m) {
      var mix = this.mixed_states[m];
      mix.reg.rootexchange(targetQubits, conditionQubits);
    }
    this.mergeMixedStates();
    this.changed();
    return;
  }
  this.invalidateClassicalBits(targetQubits, conditionQubits);
  var targetArray = makeBitArray(targetQubits, 2);
  var target1 = new BitField(targetQubits);
  var target2 = new BitField(targetQubits);
  target1.setBit(targetArray[0], 0);
  target2.setBit(targetArray[1], 0);
  var cond1 = new BitField(target2);
  var cond2 = new BitField(target1);
  cond1.orEquals(conditionQubits);
  cond2.orEquals(conditionQubits);
  this.cnot(target1, cond1);
  this.crootnot(target2, cond2);
  this.cnot(target1, cond1);
};
QReg.prototype.rootexchange_inv = function(targetQubits, conditionQubits) {
  if (this.current_mix) {
    for (var m = 0;m < this.mixed_states.length;++m) {
      var mix = this.mixed_states[m];
      mix.reg.rootexchange_inv(targetQubits, conditionQubits);
    }
    this.mergeMixedStates();
    this.changed();
    return;
  }
  this.invalidateClassicalBits(targetQubits, conditionQubits);
  var targetArray = makeBitArray(targetQubits, 2);
  var target1 = new BitField(targetQubits);
  var target2 = new BitField(targetQubits);
  target1.setBit(targetArray[0], 0);
  target2.setBit(targetArray[1], 0);
  var cond1 = new BitField(target2);
  var cond2 = new BitField(target1);
  cond1.orEquals(conditionQubits);
  cond2.orEquals(conditionQubits);
  this.cnot(target1, cond1);
  this.crootnot_inv(target2, cond2);
  this.cnot(target1, cond1);
};
QReg.prototype.cnot = function(targetQubits, conditionQubits) {
  if (this.current_mix) {
    for (var m = 0;m < this.mixed_states.length;++m) {
      var mix = this.mixed_states[m];
      mix.reg.cnot(targetQubits, conditionQubits);
    }
    this.mergeMixedStates();
    this.changed();
    return;
  }
  if (isAllZero(targetQubits)) {
    return;
  }
  if (isAllZero(conditionQubits)) {
    this.not(targetQubits);
    return;
  }
  if (this.chp && this.chp.active) {
    if (conditionQubits.countOneBits() == 1) {
      var cond = conditionQubits.getLowestBitIndex();
      var low_targ = targetQubits.getLowestBitIndex();
      var high_targ = targetQubits.getHighestBitIndex();
      for (var targ = low_targ;targ <= high_targ;++targ) {
        if (targetQubits.getBit(targ)) {
          this.chp.cnot(null, cond, targ);
        }
      }
    }
    return;
  }
  if (this.disableSimulation) {
    this.storage.cnot(targetQubits, conditionQubits);
    this.changed();
    return;
  }
  targetQubits = bitFieldToInt(targetQubits);
  conditionQubits = bitFieldToInt(conditionQubits);
  if ((conditionQubits & this.classicalBitsValid) != conditionQubits) {
    this.invalidateClassicalBits(targetQubits);
  } else {
    if ((this.classicalBits & conditionQubits) == conditionQubits) {
      this.classicalBits ^= targetQubits;
    }
  }
  for (var i = 0;i < this.numQubits;++i) {
    var mask = 1 << i;
    if (targetQubits & mask) {
      this.storage.cnot(mask, conditionQubits, this.storage);
    }
  }
  if (qc_options.noise_probability) {
    this.apply_noise(qc_options.noise_magnitude, targetQubits, qc_options.noise_func);
    this.apply_noise(qc_options.noise_magnitude, conditionQubits, qc_options.noise_func);
  }
  this.changed();
};
QRegNode.prototype.cnot = function(targetQubit, conditionQubits, pairBranch) {
  if (targetQubit == 0) {
    return;
  }
  if (conditionQubits == 0) {
    if (targetQubit & (this.bitValue | this.kidMask)) {
      this.not(targetQubit);
    } else {
      var temp = this.tree[0];
      this.tree[0] = pairBranch.tree[0];
      pairBranch.tree[0] = temp;
      var temp = this.tree[1];
      this.tree[1] = pairBranch.tree[1];
      pairBranch.tree[1] = temp;
    }
  } else {
    if (conditionQubits & this.bitValue) {
      this.tree[1].cnot(targetQubit, conditionQubits & this.kidMask, pairBranch.tree[1]);
    } else {
      if (targetQubit == this.bitValue) {
        this.tree[0].cnot(targetQubit, conditionQubits & this.kidMask, this.tree[1]);
      } else {
        this.tree[0].cnot(targetQubit, conditionQubits & this.kidMask, pairBranch.tree[0]);
        this.tree[1].cnot(targetQubit, conditionQubits & this.kidMask, pairBranch.tree[1]);
      }
    }
  }
};
QBlock.prototype.cnot = function(targetQubit, conditionQubits, pairBlock) {
  if (this.gpuBlock) {
    this.gpuBlock.op_not(targetQubit, conditionQubits, 0, pairBlock.gpuBlock);
    if (!webgl_blocks.side_by_side_checking) {
      return;
    }
  }
  var vals = 1 << this.numQubits;
  var temp;
  var starter = conditionQubits;
  var shifter = targetQubit;
  while (shifter) {
    starter &= ~shifter;
    shifter >>= 1;
  }
  if (pairBlock != this) {
    var index;
    for (var column = starter;column < vals;++column) {
      if ((column & conditionQubits) == conditionQubits) {
        index = column * 2;
        temp = this.values[index];
        this.values[index] = pairBlock.values[index];
        pairBlock.values[index] = temp;
        temp = this.values[index + 1];
        this.values[index + 1] = pairBlock.values[index + 1];
        pairBlock.values[index + 1] = temp;
      }
    }
  } else {
    var index1;
    var index2;
    var column1 = starter;
    var column2 = column1 + targetQubit;
    while (column1 < vals) {
      for (var j = 0;j < targetQubit;++j) {
        if ((column1 & conditionQubits) == conditionQubits) {
          index1 = column1 * 2;
          index2 = column2 * 2;
          temp = this.values[index1];
          this.values[index1] = this.values[index2];
          this.values[index2] = temp;
          temp = this.values[index1 + 1];
          this.values[index1 + 1] = this.values[index2 + 1];
          this.values[index2 + 1] = temp;
        }
        column1++;
        column2++;
      }
      column1 += targetQubit;
      column2 += targetQubit;
    }
  }
  if (this.gpuBlock && webgl_blocks.side_by_side_checking) {
    this.gpuBlock.side_by_side_check("cNOT", this.values);
  }
};
QReg.prototype.apply_noise = function(noiseMagnitude, targetQubits, noiseFunc) {
  this.noise_level = 0;
  var noise_count = 0;
  var save_noise_prob = qc_options.noise_probability;
  qc_options.noise_probability = 0;
  if (noiseFunc) {
    noiseFunc(this, noiseMagnitude, targetQubits);
  } else {
    var bf = NewBitField(0, this.numQubits);
    if (Math.random() < save_noise_prob) {
      var max_noise = 0;
      var low = targetQubits.getLowestBitIndex();
      var high = targetQubits.getHighestBitIndex();
      bf.set(0);
      bf.setBit(low, 1);
      for (var bit = low;bit <= high;++bit) {
        if (bf.andIsNotEqualZero(targetQubits)) {
          var phaseMag = noiseMagnitude * (2 * Math.random() - 1);
          max_noise = Math.max(max_noise, Math.abs(phaseMag));
          this.phaseShift(bf, 180 * phaseMag);
          var xmag = noiseMagnitude * (2 * Math.random() - 1);
          max_noise = Math.max(max_noise, Math.abs(xmag));
          this.rotatex(bf, 180 * xmag);
        }
        bf.shiftLeft1();
      }
      this.noise_level += max_noise;
      noise_count += 2;
    }
    bf.recycle();
  }
  if (noise_count) {
    this.noise_level /= noise_count;
  }
  qc_options.noise_probability = save_noise_prob;
};
QReg.prototype.noise = function(noiseMagnitude, targetQubits, noiseFunc) {
  if (this.current_mix) {
    for (var m = 0;m < this.mixed_states.length;++m) {
      var mix = this.mixed_states[m];
      mix.reg.noise(noiseMagnitude, targetQubits, noiseFunc);
    }
    this.mergeMixedStates();
    this.changed();
    return;
  }
  if (noiseMagnitude == null) {
    noiseMagnitude = 1;
  }
  if (targetQubits == null) {
    targetQubits = this.allBitsMask;
  }
  var save_noise_prob = qc_options.noise_probability;
  qc_options.noise_probability = 1;
  this.apply_noise(noiseMagnitude, targetQubits, noiseFunc);
  qc_options.noise_probability = save_noise_prob;
};
QReg.prototype.phaseShift = function(conditionQubits, phiDegrees) {
  if (this.current_mix) {
    for (var m = 0;m < this.mixed_states.length;++m) {
      var mix = this.mixed_states[m];
      mix.reg.phaseShift(conditionQubits, phiDegrees);
    }
    this.mergeMixedStates();
    this.changed();
    return;
  }
  if (phiDegrees == 0) {
    return;
  }
  if (conditionQubits == null) {
    conditionQubits = this.allBitsMask;
  }
  if (isAllZero(conditionQubits)) {
    return;
  }
  if (this.chp && this.chp.active) {
    if (conditionQubits.countOneBits() == 1) {
      var phi = phiDegrees;
      while (phi < 0) {
        phi += 360;
      }
      var phi_iters = Math.floor(phi / 90);
      if (phi_iters * 90 == phi) {
        var cond = conditionQubits.getLowestBitIndex();
        this.chp.phase(null, cond);
      }
    } else {
      if (conditionQubits.countOneBits() == 2 && phiDegrees == 180) {
        var bit1 = conditionQubits.getLowestBitIndex();
        var bit2 = conditionQubits.getHighestBitIndex();
        this.chp.hadamard(null, bit2);
        this.chp.cnot(null, bit1, bit2);
        this.chp.hadamard(null, bit2);
      }
    }
    return;
  }
  if (this.disableSimulation) {
    this.storage.phaseShift(conditionQubits, phiDegrees);
    this.changed();
    return;
  }
  conditionQubits = bitFieldToInt(conditionQubits);
  conditionQubits &= ~(~0 << this.numQubits);
  if (this.use_photon_sim) {
    this.photonSim.phase(conditionQubits, phiDegrees);
    this.changed();
    return;
  }
  var phiRadians = phiDegrees * Math.PI / 180;
  var sval = Math.sin(phiRadians);
  var cval = Math.cos(phiRadians);
  this.storage.phaseShift(conditionQubits, sval, cval);
  if (qc_options.noise_probability) {
    this.apply_noise(qc_options.noise_magnitude, conditionQubits, qc_options.noise_func);
  }
  this.changed();
};
QRegNode.prototype.phaseShift = function(conditionQubits, sval, cval) {
  if (conditionQubits & this.bitValue) {
    this.tree[1].phaseShift(conditionQubits & this.kidMask, sval, cval);
  } else {
    this.tree[0].phaseShift(conditionQubits & this.kidMask, sval, cval);
    this.tree[1].phaseShift(conditionQubits & this.kidMask, sval, cval);
  }
};
QBlock.prototype.phaseShift = function(conditionQubits, sval, cval) {
  if (this.gpuBlock) {
    this.gpuBlock.op_phase(conditionQubits, 0, sval, cval);
    if (!webgl_blocks.side_by_side_checking) {
      return;
    }
  }
  var vals = 1 << this.numQubits;
  var ax, ay;
  var starter = conditionQubits;
  if (conditionQubits == 0) {
    var index;
    for (var column = starter;column < vals;++column) {
      index = column * 2;
      ax = this.values[index];
      ay = this.values[index + 1];
      this.values[index] = cval * ax + sval * ay;
      this.values[index + 1] = cval * ay - sval * ax;
    }
  } else {
    var index;
    for (var column = starter;column < vals;++column) {
      if ((column & conditionQubits) == conditionQubits) {
        index = column * 2;
        ax = this.values[index];
        ay = this.values[index + 1];
        this.values[index] = cval * ax + sval * ay;
        this.values[index + 1] = cval * ay - sval * ax;
      }
    }
  }
  if (this.gpuBlock && webgl_blocks.side_by_side_checking) {
    this.gpuBlock.side_by_side_check("phaseShift", this.values);
  }
};
QReg.prototype.op2x2 = function(targetQubits, opFunc, opData, mtx2x2) {
  if (this.current_mix) {
    for (var m = 0;m < this.mixed_states.length;++m) {
      var mix = this.mixed_states[m];
      mix.reg.op2x2(targetQubits, opFunc, opData, mtx2x2);
    }
    this.mergeMixedStates();
    this.changed();
    return;
  }
  this.invalidateClassicalBits(targetQubits);
  if (isAllZero(targetQubits)) {
    return;
  }
  if (this.disableSimulation) {
    this.storage.op2x2(targetQubits, opFunc, opData, mtx2x2);
    this.changed();
    return;
  }
  targetQubits = bitFieldToInt(targetQubits);
  this.invalidateClassicalBits(targetQubits);
  if (printSpeedMetrics) {
    var startTime = (new Date).getTime();
    console.log("2x2 start...\n");
  }
  for (var i = 0;i < this.numQubits;++i) {
    var mask = 1 << i;
    if (targetQubits & mask) {
      this.storage.op2x2(mask, opFunc, opData, mtx2x2, this.storage);
    }
  }
  if (printSpeedMetrics) {
    var elapsedTimeMS = (new Date).getTime() - startTime;
    console.log("2x2 op time: " + elapsedTimeMS / 1E3 + " seconds.\n");
  }
  this.changed();
};
QRegNode.prototype.op2x2 = function(targetQubit, opFunc, opData, mtx2x2, pairBranch) {
  if (targetQubit == 0) {
    return;
  }
  if (targetQubit == this.bitValue) {
    this.tree[0].op2x2(targetQubit, opFunc, opData, mtx2x2, this.tree[1]);
  } else {
    this.tree[0].op2x2(targetQubit, opFunc, opData, mtx2x2, pairBranch.tree[0]);
    this.tree[1].op2x2(targetQubit, opFunc, opData, mtx2x2, pairBranch.tree[1]);
  }
};
QBlock.prototype.op2x2 = function(targetQubit, opFunc, opData, mtx2x2, pairBlock) {
  if (this.gpuBlock) {
    this.gpuBlock.op_2x2(targetQubit, mtx2x2, pairBlock.gpuBlock);
    if (!webgl_blocks.side_by_side_checking) {
      return;
    }
  }
  var vals = 1 << this.numQubits;
  var starter = 0;
  if (pairBlock != this) {
    var index;
    for (var column = starter;column < vals;++column) {
      index = column * 2;
      opFunc(this.values, index, pairBlock.values, index, opData);
    }
  } else {
    var index1;
    var index2;
    var column1 = starter;
    var column2 = column1 + targetQubit;
    while (column1 < vals) {
      for (var j = 0;j < targetQubit;++j) {
        index1 = column1 * 2;
        index2 = column2 * 2;
        opFunc(this.values, index1, this.values, index2, opData);
        column1++;
        column2++;
      }
      column1 += targetQubit;
      column2 += targetQubit;
    }
  }
  if (this.gpuBlock && webgl_blocks.side_by_side_checking) {
    this.gpuBlock.side_by_side_check("2x2 bit" + targetQubit, this.values);
    if (pairBlock != this) {
      pairBlock.gpuBlock.side_by_side_check("2x2 bit (pairBlock)" + targetQubit, pairBlock.values);
    }
  }
};
QReg.prototype.cop2x2 = function(targetQubits, conditionQubits, opFunc, opData, mtx2x2) {
  if (this.current_mix) {
    for (var m = 0;m < this.mixed_states.length;++m) {
      var mix = this.mixed_states[m];
      mix.reg.cop2x2(targetQubits, conditionQubits, opFunc, opData, mtx2x2);
    }
    this.mergeMixedStates();
    this.changed();
    return;
  }
  this.invalidateClassicalBits(targetQubits, conditionQubits);
  if (isAllZero(targetQubits)) {
    return;
  }
  if (isAllZero(conditionQubits)) {
    this.op2x2(targetQubits, opFunc, opData, mtx2x2);
    return;
  }
  if (this.disableSimulation) {
    this.storage.cop2x2(targetQubits, conditionQubits, opFunc, opData, mtx2x2);
    this.changed();
    return;
  }
  targetQubits = bitFieldToInt(targetQubits);
  conditionQubits = bitFieldToInt(conditionQubits);
  this.invalidateClassicalBits(targetQubits);
  for (var i = 0;i < this.numQubits;++i) {
    var mask = 1 << i;
    if (targetQubits & mask) {
      this.storage.cop2x2(mask, conditionQubits, opFunc, opData, mtx2x2, this.storage);
    }
  }
  this.changed();
};
QRegNode.prototype.cop2x2 = function(targetQubit, conditionQubits, opFunc, opData, mtx2x2, pairBranch) {
  if (targetQubit == 0) {
    return;
  }
  if (conditionQubits & this.bitValue) {
    this.tree[1].cop2x2(targetQubit, conditionQubits & this.kidMask, opFunc, opData, mtx2x2, pairBranch.tree[1]);
  } else {
    if (targetQubit == this.bitValue) {
      this.tree[0].cop2x2(targetQubit, conditionQubits & this.kidMask, opFunc, opData, mtx2x2, this.tree[1]);
    } else {
      this.tree[0].cop2x2(targetQubit, conditionQubits & this.kidMask, opFunc, opData, mtx2x2, pairBranch.tree[0]);
      this.tree[1].cop2x2(targetQubit, conditionQubits & this.kidMask, opFunc, opData, mtx2x2, pairBranch.tree[1]);
    }
  }
};
QBlock.prototype.cop2x2 = function(targetQubit, conditionQubits, opFunc, opData, mtx2x2, pairBlock) {
  var vals = 1 << this.numQubits;
  var temp;
  var starter = conditionQubits;
  var shifter = targetQubit;
  while (shifter) {
    starter &= ~shifter;
    shifter >>= 1;
  }
  if (pairBlock != this) {
    var index;
    for (var column = starter;column < vals;++column) {
      if ((column & conditionQubits) == conditionQubits) {
        index = column * 2;
        opFunc(this.values, index, pairBlock.values, index, opData);
      }
    }
  } else {
    var index1;
    var index2;
    var column1 = starter;
    var column2 = column1 + targetQubit;
    while (column1 < vals) {
      for (var j = 0;j < targetQubit;++j) {
        if ((column1 & conditionQubits) == conditionQubits) {
          index1 = column1 * 2;
          index2 = column2 * 2;
          opFunc(this.values, index1, this.values, index2, opData);
        }
        column1++;
        column2++;
      }
      column1 += targetQubit;
      column2 += targetQubit;
    }
  }
  if (this.gpuBlock && webgl_blocks.side_by_side_checking) {
    this.gpuBlock.side_by_side_check("c2x2", this.values);
  }
};
function blockOp_Hadamard(array1, index1, array2, index2, opData) {
  var oneOverRoot2 = opData;
  var ar = array1[index1];
  var ai = array1[index1 + 1];
  var br = array2[index2];
  var bi = array2[index2 + 1];
  array1[index1] = (ar + br) * oneOverRoot2;
  array1[index1 + 1] = (ai + bi) * oneOverRoot2;
  array2[index2] = (ar - br) * oneOverRoot2;
  array2[index2 + 1] = (ai - bi) * oneOverRoot2;
}
QReg.prototype.hadamard = function(targetQubits) {
  if (this.current_mix) {
    for (var m = 0;m < this.mixed_states.length;++m) {
      var mix = this.mixed_states[m];
      mix.reg.hadamard(targetQubits);
    }
    this.mergeMixedStates();
    this.changed();
    return;
  }
  if (targetQubits == null) {
    targetQubits = this.allBitsMask;
  }
  if (this.chp && this.chp.active) {
    var low_targ = targetQubits.getLowestBitIndex();
    var high_targ = targetQubits.getHighestBitIndex();
    for (var targ = low_targ;targ <= high_targ;++targ) {
      if (targetQubits.getBit(targ)) {
        this.chp.hadamard(null, targ);
      }
    }
    return;
  }
  var oneOverRoot2 = 1 / Math.sqrt(2);
  var mtx2x2 = [[{real:oneOverRoot2, imag:0}, {real:oneOverRoot2, imag:0}], [{real:oneOverRoot2, imag:0}, {real:-oneOverRoot2, imag:0}]];
  this.op2x2(targetQubits, blockOp_Hadamard, oneOverRoot2, mtx2x2);
  if (qc_options.noise_probability) {
    this.apply_noise(qc_options.noise_magnitude, targetQubits, qc_options.noise_func);
  }
};
QReg.prototype.chadamard = function(targetQubits, conditionQubits) {
  if (this.current_mix) {
    for (var m = 0;m < this.mixed_states.length;++m) {
      var mix = this.mixed_states[m];
      mix.reg.chadamard(targetQubits, conditionQubits);
    }
    this.mergeMixedStates();
    this.changed();
    return;
  }
  if (this.chp && this.chp.active) {
    if (targetQubits == null) {
      targetQubits = this.allBitsMask;
    }
    if (isAllZero(conditionQubits)) {
      var low_targ = targetQubits.getLowestBitIndex();
      var high_targ = targetQubits.getHighestBitIndex();
      for (var targ = low_targ;targ <= high_targ;++targ) {
        if (targetQubits.getBit(targ)) {
          this.chp.hadamard(null, targ);
        }
      }
    }
    return;
  }
  var oneOverRoot2 = 1 / Math.sqrt(2);
  var mtx2x2 = [[{real:oneOverRoot2, imag:0}, {real:oneOverRoot2, imag:0}], [{real:oneOverRoot2, imag:0}, {real:-oneOverRoot2, imag:0}]];
  this.cop2x2(targetQubits, conditionQubits, blockOp_Hadamard, oneOverRoot2, mtx2x2);
  if (qc_options.noise_probability) {
    this.apply_noise(qc_options.noise_magnitude, targetQubits, qc_options.noise_func);
  }
};
QReg.prototype.optical_phase = function(targetQubits, phiDegrees) {
  if (this.current_mix) {
    for (var m = 0;m < this.mixed_states.length;++m) {
      var mix = this.mixed_states[m];
      mix.reg.optical_phase(targetQubits, phiDegrees);
    }
    this.mergeMixedStates();
    this.changed();
    return;
  }
  this.invalidateClassicalBits(targetQubits);
  if (targetQubits == null) {
    targetQubits = this.allBitsMask;
  }
  var phiRadians = phiDegrees * Math.PI / 180;
  var sval = Math.sin(phiRadians);
  var cval = Math.cos(phiRadians);
  var mtx2x2 = [[{real:cval, imag:-sval}, {real:0, imag:0}], [{real:0, imag:0}, {real:1, imag:0}]];
  this.op2x2(targetQubits, blockOp_2x2, mtx2x2, mtx2x2);
};
QReg.prototype.optical_beamsplitter = function(targetQubits, reflectivity) {
  if (this.current_mix) {
    for (var m = 0;m < this.mixed_states.length;++m) {
      var mix = this.mixed_states[m];
      mix.reg.optical_beamsplitter(targetQubits, reflectivity);
    }
    this.mergeMixedStates();
    this.changed();
    return;
  }
  this.invalidateClassicalBits(targetQubits);
  if (reflectivity == null) {
    reflectivity = .5;
  }
  if (targetQubits == null) {
    targetQubits = this.allBitsMask;
  }
  var dir = 1;
  if (reflectivity < 0) {
    dir = -1;
    reflectivity = -reflectivity;
  }
  var root_r = Math.sqrt(reflectivity);
  var root_one_minus_r = Math.sqrt(1 - reflectivity);
  var mtx2x2 = [[{real:root_r, imag:0}, {real:0, imag:dir * root_one_minus_r}], [{real:0, imag:dir * root_one_minus_r}, {real:root_r, imag:0}]];
  this.op2x2(targetQubits, blockOp_2x2, mtx2x2, mtx2x2);
};
QReg.prototype.coptical_beamsplitter = function(targetQubits, conditionQubits, reflectivity) {
  if (this.current_mix) {
    for (var m = 0;m < this.mixed_states.length;++m) {
      var mix = this.mixed_states[m];
      mix.reg.coptical_beamsplitter(targetQubits, conditionQubits, reflectivity);
    }
    this.mergeMixedStates();
    this.changed();
    return;
  }
  this.invalidateClassicalBits(targetQubits, conditionQubits);
  if (reflectivity == null) {
    reflectivity = .5;
  }
  if (targetQubits == null) {
    targetQubits = this.allBitsMask;
  }
  var dir = 1;
  if (reflectivity < 0) {
    dir = -1;
    reflectivity = -reflectivity;
  }
  var root_r = Math.sqrt(reflectivity);
  var root_one_minus_r = Math.sqrt(1 - reflectivity);
  var mtx2x2 = [[{real:root_r, imag:0}, {real:0, imag:dir * root_one_minus_r}], [{real:0, imag:dir * root_one_minus_r}, {real:root_r, imag:0}]];
  this.cop2x2(targetQubits, conditionQubits, blockOp_2x2, mtx2x2, mtx2x2);
};
QReg.prototype.dual_rail_beamsplitter = function(targetQubits, conditionQubits, reflectivity, auxQubits) {
  if (this.current_mix) {
    for (var m = 0;m < this.mixed_states.length;++m) {
      var mix = this.mixed_states[m];
      mix.reg.dual_rail_beamsplitter(targetQubits, conditionQubits, reflectivity, auxQubits);
    }
    this.mergeMixedStates();
    this.changed();
    return;
  }
  this.invalidateClassicalBits(targetQubits, conditionQubits);
  if (reflectivity == null) {
    reflectivity = .5;
  }
  if (targetQubits == null) {
    targetQubits = this.allBitsMask;
  }
  if (this.use_photon_sim) {
    if (targetQubits) {
      this.photonSim.beamsplitter(targetQubits, reflectivity);
    }
    if (auxQubits) {
      this.photonSim.beamsplitter_aux(auxQubits, reflectivity);
    }
    this.changed();
    return;
  }
  var targetArray = makeBitArray(targetQubits, 2);
  var target1 = new BitField(targetQubits);
  var target2 = new BitField(targetQubits);
  target1.setBit(targetArray[0], 0);
  target2.setBit(targetArray[1], 0);
  var cond1 = new BitField(target2);
  var cond2 = new BitField(target1);
  cond1.orEquals(conditionQubits);
  cond2.orEquals(conditionQubits);
  this.cnot(target1, cond1);
  this.coptical_beamsplitter(target2, cond2, reflectivity);
  this.cnot(target1, cond1);
};
QReg.prototype.pair_source = function(targetQubits, conditionQubits) {
  if (this.current_mix) {
    for (var m = 0;m < this.mixed_states.length;++m) {
      var mix = this.mixed_states[m];
      mix.reg.pair_source(targetQubits, conditionQubits);
    }
    this.mergeMixedStates();
    this.changed();
    return;
  }
  if (this.use_photon_sim) {
    this.photonSim.pair_source(targetQubits);
    this.changed();
    return;
  }
  this.write(targetQubits, 0);
  this.write(conditionQubits, 0);
  var low_cond = conditionQubits.getLowestBitIndex();
  var high_cond = conditionQubits.getHighestBitIndex();
  var low_targ = targetQubits.getLowestBitIndex();
  var high_targ = targetQubits.getHighestBitIndex();
  if (low_cond == high_cond) {
    this.hadamard(conditionQubits);
    this.cnot(targetQubits, conditionQubits);
  } else {
    this.hadamard(1 << low_cond);
    this.not(1 << high_cond);
    this.cnot(1 << high_cond, 1 << low_cond);
    this.cnot(1 << low_targ, 1 << low_cond);
    this.cnot(1 << high_targ, 1 << high_cond);
  }
};
QReg.prototype.polarization_grating_in = function(targetQubits, conditionQubits, theta) {
  if (this.current_mix) {
    for (var m = 0;m < this.mixed_states.length;++m) {
      var mix = this.mixed_states[m];
      mix.reg.polarization_grating_in(targetQubits, conditionQubits, theta);
    }
    this.mergeMixedStates();
    this.changed();
    return;
  }
  this.invalidateClassicalBits(targetQubits, conditionQubits);
  if (theta == null) {
    theta = 0;
  }
  if (targetQubits == null) {
    targetQubits = this.allBitsMask;
  }
  if (this.use_photon_sim) {
    this.photonSim.polarization_grating_in(targetQubits, theta);
    this.changed();
    return;
  }
  var targetArray = makeBitArray(targetQubits, 2);
  var target1 = new BitField(targetQubits);
  var target2 = new BitField(targetQubits);
  target1.setBit(targetArray[0], 0);
  target2.setBit(targetArray[1], 0);
  var cond1 = new BitField(target2);
  var cond2 = new BitField(target1);
  cond1.orEquals(conditionQubits);
  cond2.orEquals(conditionQubits);
  if (theta < 0) {
    this.write(target2, ~0);
    this.cnot(target2, target1);
  } else {
    this.write(target1, ~0);
    this.cnot(target1, target2);
  }
};
QReg.prototype.polarization_grating_out = function(targetQubits, conditionQubits, theta) {
  if (this.current_mix) {
    for (var m = 0;m < this.mixed_states.length;++m) {
      var mix = this.mixed_states[m];
      mix.reg.polarization_grating_out(targetQubits, conditionQubits, theta);
    }
    this.mergeMixedStates();
    this.changed();
    return;
  }
  this.invalidateClassicalBits(targetQubits, conditionQubits);
  if (theta == null) {
    theta = 0;
  }
  if (targetQubits == null) {
    targetQubits = this.allBitsMask;
  }
  if (this.use_photon_sim) {
    this.photonSim.polarization_grating_out(targetQubits, theta);
    this.changed();
    return;
  }
  var targetArray = makeBitArray(targetQubits, 2);
  var target1 = new BitField(targetQubits);
  var target2 = new BitField(targetQubits);
  target1.setBit(targetArray[0], 0);
  target2.setBit(targetArray[1], 0);
  var cond1 = new BitField(target2);
  var cond2 = new BitField(target1);
  cond1.orEquals(conditionQubits);
  cond2.orEquals(conditionQubits);
  if (theta < 0) {
    this.cnot(target2, target1);
    this.not(target2);
    this.postselect(target2, 0);
  } else {
    this.cnot(target1, target2);
    this.not(target1);
    this.postselect(target1, 0);
  }
};
function blockOp_2x2(array1, index1, array2, index2, opData) {
  var m = opData;
  var ar = array1[index1];
  var ai = array1[index1 + 1];
  var br = array2[index2];
  var bi = array2[index2 + 1];
  array1[index1] = m[0][0].real * ar - m[0][0].imag * ai + m[0][1].real * br - m[0][1].imag * bi;
  array1[index1 + 1] = m[0][0].real * ai + m[0][0].imag * ar + m[0][1].real * bi + m[0][1].imag * br;
  array2[index2] = m[1][0].real * ar - m[1][0].imag * ai + m[1][1].real * br - m[1][1].imag * bi;
  array2[index2 + 1] = m[1][0].real * ai + m[1][0].imag * ar + m[1][1].real * bi + m[1][1].imag * br;
}
function blockOp_Rotatey(array1, index1, array2, index2, opData) {
  var sval = opData[0];
  var cval = opData[1];
  var ar = array1[index1];
  var ai = array1[index1 + 1];
  var br = array2[index2];
  var bi = array2[index2 + 1];
  array1[index1] = cval * ar + sval * bi;
  array1[index1 + 1] = cval * ai - sval * br;
  array2[index2] = cval * br + sval * ai;
  array2[index2 + 1] = cval * bi - sval * ar;
}
function blockOp_Rotatex(array1, index1, array2, index2, opData) {
  var sval = opData[0];
  var cval = opData[1];
  var ar = array1[index1];
  var ai = array1[index1 + 1];
  var br = array2[index2];
  var bi = array2[index2 + 1];
  array1[index1] = cval * ar - sval * br;
  array1[index1 + 1] = cval * ai - sval * bi;
  array2[index2] = cval * br + sval * ar;
  array2[index2 + 1] = cval * bi + sval * ai;
}
QReg.prototype.rotatex = function(targetQubits, thetaDegrees) {
  if (this.current_mix) {
    for (var m = 0;m < this.mixed_states.length;++m) {
      var mix = this.mixed_states[m];
      mix.reg.rotatex(targetQubits, thetaDegrees);
    }
    this.mergeMixedStates();
    this.changed();
    return;
  }
  if (targetQubits == null) {
    targetQubits = this.allBitsMask;
  }
  var thetaRadians = thetaDegrees * Math.PI / 180;
  var sval = Math.sin(thetaRadians);
  var cval = Math.cos(thetaRadians);
  var mtx2x2 = [[{real:0, imag:0}, {real:0, imag:0}], [{real:0, imag:0}, {real:0, imag:0}]];
  this.op2x2(targetQubits, blockOp_Rotatex, [sval, cval], mtx2x2);
};
QReg.prototype.crotatex = function(targetQubits, conditionQubits, thetaDegrees) {
  if (this.current_mix) {
    for (var m = 0;m < this.mixed_states.length;++m) {
      var mix = this.mixed_states[m];
      mix.reg.crotatex(targetQubits, conditionQubits, thetaDegrees);
    }
    this.mergeMixedStates();
    this.changed();
    return;
  }
  var thetaRadians = thetaDegrees * Math.PI / 180;
  var sval = Math.sin(thetaRadians);
  var cval = Math.cos(thetaRadians);
  var mtx2x2 = [[{real:0, imag:0}, {real:0, imag:0}], [{real:0, imag:0}, {real:0, imag:0}]];
  this.cop2x2(targetQubits, conditionQubits, blockOp_Rotatex, [sval, cval], mtx2x2);
};
QReg.prototype.rotate = QReg.prototype.rotatex;
QReg.prototype.crotate = QReg.prototype.crotatex;
QReg.prototype.rotatey = function(targetQubits, thetaDegrees) {
  if (this.current_mix) {
    for (var m = 0;m < this.mixed_states.length;++m) {
      var mix = this.mixed_states[m];
      mix.reg.rotatey(targetQubits, thetaDegrees);
    }
    this.mergeMixedStates();
    this.changed();
    return;
  }
  if (targetQubits == null) {
    targetQubits = this.allBitsMask;
  }
  var thetaRadians = thetaDegrees * Math.PI / 180;
  var sval = Math.sin(thetaRadians);
  var cval = Math.cos(thetaRadians);
  var mtx2x2 = [[{real:0, imag:0}, {real:0, imag:0}], [{real:0, imag:0}, {real:0, imag:0}]];
  this.op2x2(targetQubits, blockOp_Rotatey, [sval, cval], mtx2x2);
};
QReg.prototype.crotatey = function(targetQubits, conditionQubits, thetaDegrees) {
  if (this.current_mix) {
    for (var m = 0;m < this.mixed_states.length;++m) {
      var mix = this.mixed_states[m];
      mix.reg.crotatey(targetQubits, conditionQubits, thetaDegrees);
    }
    this.mergeMixedStates();
    this.changed();
    return;
  }
  var thetaRadians = thetaDegrees * Math.PI / 180;
  var sval = Math.sin(thetaRadians);
  var cval = Math.cos(thetaRadians);
  var mtx2x2 = [[{real:0, imag:0}, {real:0, imag:0}], [{real:0, imag:0}, {real:0, imag:0}]];
  this.cop2x2(targetQubits, conditionQubits, blockOp_Rotatey, [sval, cval], mtx2x2);
};
function blockOp_RootNot(array1, index1, array2, index2, opData) {
  var direction = opData;
  var half = .5;
  var ar = array1[index1];
  var ai = array1[index1 + 1];
  var br = array2[index2];
  var bi = array2[index2 + 1];
  if (direction > 0) {
    array1[index1] = (ar - ai + br + bi) * half;
    array1[index1 + 1] = (ar + ai - br + bi) * half;
    array2[index2] = (ar + ai + br - bi) * half;
    array2[index2 + 1] = (ai - ar + br + bi) * half;
  } else {
    array1[index1] = (ar + ai + br - bi) * half;
    array1[index1 + 1] = (ai - ar + br + bi) * half;
    array2[index2] = (ar - ai + br + bi) * half;
    array2[index2 + 1] = (ar + ai - br + bi) * half;
  }
}
QReg.prototype.rootnot = function(targetQubits) {
  if (this.current_mix) {
    for (var m = 0;m < this.mixed_states.length;++m) {
      var mix = this.mixed_states[m];
      mix.reg.rootnot(targetQubits);
    }
    this.mergeMixedStates();
    this.changed();
    return;
  }
  if (targetQubits == null) {
    targetQubits = this.allBitsMask;
  }
  var mtx2x2 = [[{real:0, imag:0}, {real:0, imag:0}], [{real:0, imag:0}, {real:0, imag:0}]];
  this.op2x2(targetQubits, blockOp_RootNot, 1, mtx2x2);
};
QReg.prototype.rootnot_inv = function(targetQubits) {
  if (this.current_mix) {
    for (var m = 0;m < this.mixed_states.length;++m) {
      var mix = this.mixed_states[m];
      mix.reg.rootnot_inv(targetQubits);
    }
    this.mergeMixedStates();
    this.changed();
    return;
  }
  if (targetQubits == null) {
    targetQubits = this.allBitsMask;
  }
  var mtx2x2 = [[{real:0, imag:0}, {real:0, imag:0}], [{real:0, imag:0}, {real:0, imag:0}]];
  this.op2x2(targetQubits, blockOp_RootNot, -1, mtx2x2);
};
QReg.prototype.crootnot = function(targetQubits, conditionQubits) {
  if (this.current_mix) {
    for (var m = 0;m < this.mixed_states.length;++m) {
      var mix = this.mixed_states[m];
      mix.reg.crootnot(targetQubits, conditionQubits);
    }
    this.mergeMixedStates();
    this.changed();
    return;
  }
  var mtx2x2 = [[{real:0, imag:0}, {real:0, imag:0}], [{real:0, imag:0}, {real:0, imag:0}]];
  this.cop2x2(targetQubits, conditionQubits, blockOp_RootNot, 1, mtx2x2);
};
QReg.prototype.crootnot_inv = function(targetQubits, conditionQubits) {
  if (this.current_mix) {
    for (var m = 0;m < this.mixed_states.length;++m) {
      var mix = this.mixed_states[m];
      mix.reg.crootnot_inv(targetQubits, conditionQubits);
    }
    this.mergeMixedStates();
    this.changed();
    return;
  }
  var mtx2x2 = [[{real:0, imag:0}, {real:0, imag:0}], [{real:0, imag:0}, {real:0, imag:0}]];
  this.cop2x2(targetQubits, conditionQubits, blockOp_RootNot, -1, mtx2x2);
};
QRegNode.prototype.setZeroMask = function(targetQubits, targetValues) {
  if (targetQubits == 0) {
    return;
  }
  if (targetQubits & this.bitValue) {
    var target = targetValues >> this.numQubits - 1;
    this.tree[1 - target].setZero();
    this.tree[target].setZeroMask(targetQubits & this.kidMask, targetValues & this.kidMask);
  } else {
    this.tree[0].setZeroMask(targetQubits, targetValues);
    this.tree[1].setZeroMask(targetQubits, targetValues);
  }
};
QBlock.prototype.setZeroMask = function(targetQubits, targetValues) {
  if (targetQubits == 0) {
    return;
  }
  if (this.gpuBlock) {
    this.gpuBlock.op_set_bits(targetQubits, targetValues);
    if (!webgl_blocks.side_by_side_checking) {
      return;
    }
  }
  var vals = 1 << this.numQubits;
  var column;
  var index;
  for (var bit = 0;bit < this.numQubits;++bit) {
    var mask = 1 << bit;
    if (mask & targetQubits) {
      if (mask & targetValues) {
        column = 0;
      } else {
        column = mask;
      }
      while (column < vals) {
        for (var i = 0;i < mask;++i) {
          index = (column + i) * 2;
          this.values[index] = 0;
          this.values[index + 1] = 0;
        }
        column += mask * 2;
      }
    }
  }
  if (this.gpuBlock && webgl_blocks.side_by_side_checking) {
    this.gpuBlock.side_by_side_check("SetZeroMask", this.values);
  }
};
QReg.prototype.readAll = function() {
  if (this.current_mix) {
    this.mergeMixedStates();
  }
  return this.read(this.allBitsMask);
};
QReg.prototype.setZero = function() {
  if (this.current_mix) {
    for (var m = 0;m < this.mixed_states.length;++m) {
      var mix = this.mixed_states[m];
      mix.reg.setZero();
    }
    this.mergeMixedStates();
    this.changed();
    return;
  }
  this.storage.setZero();
};
QReg.prototype.read = function(targetQubits, force_zero, force_one) {
  if (this.current_mix) {
    this.mergeMixedStates();
  }
  if (targetQubits == null) {
    targetQubits = this.allBitsMask;
  }
  if (isAllZero(targetQubits)) {
    return 0;
  }
  if (!this.active) {
    console.log("register needs to be activated!");
    return 0;
  }
  if (this.chp && this.chp.active) {
    var low_targ = targetQubits.getLowestBitIndex();
    var high_targ = targetQubits.getHighestBitIndex();
    var result_bf = new BitField(0, this.numQubits);
    for (var targ = low_targ;targ <= high_targ;++targ) {
      if (targetQubits.getBit(targ)) {
        var bit = this.chp.measure(null, targ);
        if (bit & 1) {
          result_bf.setBit(targ, 1);
        }
      }
    }
    this.changed();
    if (this.numQubits <= 32) {
      var result_int = bitFieldToInt(result_bf);
      result_bf.recycle();
      return result_int;
    }
    return result_bf;
  }
  if (this.disableSimulation) {
    var result = this.storage.read(targetQubits);
    this.changed();
    return result;
  }
  targetQubits = bitFieldToInt(targetQubits);
  var loop_required_targetQubits = targetQubits;
  var resultBits = 0;
  if (!fullDebugChecking) {
    if ((this.classicalBitsValid & targetQubits) == targetQubits) {
      return this.classicalBits & targetQubits;
    }
    resultBits |= this.classicalBits & this.classicalBitsValid;
    loop_required_targetQubits &= ~this.classicalBitsValid;
  }
  if (printSpeedMetrics) {
    var startTime = (new Date).getTime();
    console.log("READ start...\n");
  }
  var vals = this.numValues;
  for (var i = 0;i < this.numQubits;++i) {
    var mask = 1 << i;
    if (loop_required_targetQubits & mask) {
      var probability = this.peekQubitProbability(mask);
      var new_length = 1;
      if (probability > 0) {
        var rand = Math.random();
        if (force_zero) {
          rand = 1;
        } else {
          if (force_one) {
            rand = 0;
          }
        }
        if (rand <= probability) {
          resultBits |= mask;
          new_length = Math.sqrt(probability);
        } else {
          new_length = Math.sqrt(1 - probability);
        }
      }
      this.storage.setZeroMask(mask, resultBits);
      this.renormalize(new_length);
    }
  }
  if (printSpeedMetrics) {
    var elapsedTimeMS = (new Date).getTime() - startTime;
    console.log("READ op time: " + elapsedTimeMS / 1E3 + " seconds.\n");
  }
  if (fullDebugChecking) {
    if ((resultBits & this.classicalBitsValid) != (this.classicalBits & targetQubits & this.classicalBitsValid)) {
      console.log("============= Error: classical bit inconsistency. ========================");
      crash.here();
    }
  }
  this.setClassicalBits(targetQubits, resultBits);
  this.changed();
  return this.classicalBits & targetQubits;
};
QReg.prototype.writeAll = function(newValues) {
  if (this.current_mix) {
    for (var m = 0;m < this.mixed_states.length;++m) {
      var mix = this.mixed_states[m];
      mix.reg.writeAll(newValues);
    }
    this.mergeMixedStates();
    this.changed();
    return;
  }
  this.write(this.allBitsMask, newValues);
};
QReg.prototype.write = function(targetQubits, newValues) {
  if (this.current_mix) {
    for (var m = 0;m < this.mixed_states.length;++m) {
      var mix = this.mixed_states[m];
      mix.reg.write(targetQubits, newValues);
    }
    this.mergeMixedStates();
    this.changed();
    return;
  }
  if (targetQubits == null) {
    targetQubits = this.allBitsMask;
  }
  var bitsToFlip = intToBitField(this.read(targetQubits));
  bitsToFlip.xorEquals(newValues);
  bitsToFlip.andEquals(targetQubits);
  if (!bitsToFlip.isAllZero()) {
    this.not(bitsToFlip);
  }
  bitsToFlip.recycle();
  this.changed();
};
QReg.prototype.postselect = function(targetQubits, value) {
  if (this.current_mix) {
    for (var m = 0;m < this.mixed_states.length;++m) {
      var mix = this.mixed_states[m];
      mix.reg.postselect(targetQubits, value);
    }
    this.mergeMixedStates();
    this.changed();
    return;
  }
  if (targetQubits == null) {
    targetQubits = this.allBitsMask;
  }
  if (this.use_photon_sim) {
    this.photonSim.postselect(targetQubits, value);
    this.changed();
    return;
  }
  var force_zero = value == 0;
  var force_one = value == 1;
  this.read(targetQubits, force_zero, force_one);
  this.changed();
};
QReg.prototype.postselect_qubit_pair = function(targetQubits) {
  if (this.current_mix) {
    for (var m = 0;m < this.mixed_states.length;++m) {
      var mix = this.mixed_states[m];
      mix.reg.postselect_qubit_pair(targetQubits);
    }
    this.mergeMixedStates();
    this.changed();
    return;
  }
  if (targetQubits == null) {
    targetQubits = this.allBitsMask;
  }
  if (this.use_photon_sim) {
    this.photonSim.postselect_qubit_pair(targetQubits);
    this.changed();
    return;
  }
  var low = targetQubits.getLowestBitIndex();
  var high = targetQubits.getHighestBitIndex();
  var mask = 1 << low | 1 << high;
  targetQubits = bitFieldToInt(targetQubits);
  for (var value = 0;value < this.numValues;++value) {
    if ((value & mask) == 0 || (value & mask) == mask) {
      this.pokeComplexValue(value, 0, 0);
    }
  }
  this.renormalize();
  this.changed();
};
QReg.prototype.totalLengthSquared = function() {
  return this.storage.totalLengthSquared();
};
QRegNode.prototype.totalLengthSquared = function() {
  return this.tree[0].totalLengthSquared() + this.tree[1].totalLengthSquared();
};
QBlock.prototype.totalLengthSquared = function() {
  if (this.gpuBlock) {
    var gpu_lengthSquared = this.gpuBlock.peek_probability(0);
    if (!webgl_blocks.side_by_side_checking) {
      return gpu_lengthSquared;
    }
  }
  var lengthSquared = 0;
  var vals = 1 << this.numQubits;
  var x;
  vals *= 2;
  for (var i = 0;i < vals;++i) {
    x = this.values[i];
    lengthSquared += x * x;
  }
  if (this.gpuBlock && webgl_blocks.side_by_side_checking) {
    this.gpuBlock.side_by_side_check("totalLengthSquared", null, gpu_lengthSquared, lengthSquared);
  }
  return lengthSquared;
};
QReg.prototype.peekQubitProbability = function(targetQubit) {
  var probability = this.storage.peekQubitProbability(targetQubit);
  return probability;
};
QRegNode.prototype.peekQubitProbability = function(targetQubit) {
  if (targetQubit == this.bitValue) {
    return this.tree[1].totalLengthSquared();
  } else {
    return this.tree[0].peekQubitProbability(targetQubit) + this.tree[1].peekQubitProbability(targetQubit);
  }
};
QBlock.prototype.peekQubitProbability = function(targetQubit) {
  var probability = 0;
  var vals = 1 << this.numQubits;
  var x, y;
  var column = 0;
  var index;
  if (this.gpuBlock) {
    var gpu_probability = this.gpuBlock.peek_probability(targetQubit);
    if (!webgl_blocks.side_by_side_checking) {
      return gpu_probability;
    }
  }
  for (var i = targetQubit;i < vals;i += targetQubit * 2) {
    column += targetQubit;
    for (var j = 0;j < targetQubit;++j) {
      index = column * 2;
      x = this.values[index];
      y = this.values[index + 1];
      probability += x * x + y * y;
      column++;
    }
  }
  if (this.gpuBlock && webgl_blocks.side_by_side_checking) {
    this.gpuBlock.side_by_side_check("peekProbability", null, gpu_probability, probability);
  }
  return probability;
};
QReg.prototype.printState = function(message, start, count) {
  if (message == null) {
    message = "";
  }
  if (start == null) {
    start = 0;
  }
  if (count == null) {
    count = 1 << this.numQubits;
  }
  var str = "QReg: " + message + " ";
  for (var i = start;i < count;++i) {
    var val = this.peekComplexValue(i);
    if (val.x != 0 || val.y != 0) {
      str += "[" + i + "]=" + val.x.toFixed(6) + "," + val.y.toFixed(6) + " ";
    }
  }
  console.log(str);
};
QReg.prototype.copyAllProbabilities = function() {
  var out_array;
  if (this.doublePrecision) {
    out_array = new Float64Array(new ArrayBuffer(this.numValues * this.bytesPerFloat));
  } else {
    out_array = new Float32Array(new ArrayBuffer(this.numValues * this.bytesPerFloat));
  }
  for (var i = 0;i < this.numValues;++i) {
    var value = this.storage.peekComplexValue(i);
    out_array[i] = value.x * value.x + value.y * value.y;
  }
  return out_array;
};
QReg.prototype.pokeAllProbabilities = function(new_probabilities) {
  for (var i = 0;i < this.numValues;++i) {
    this.storage.pokeComplexValue(i, Math.sqrt(new_probabilities[i]), 0);
  }
};
QReg.prototype.peekComplexValue = function(targetValue) {
  if ((this.classicalBits & this.classicalBitsValid) != (targetValue & this.classicalBitsValid)) {
    return new Vec2(0, 0);
  }
  var value = this.storage.peekComplexValue(targetValue);
  return value;
};
QRegNode.prototype.peekComplexValue = function(targetValue) {
  if (targetValue & this.bitValue) {
    return this.tree[1].peekComplexValue(targetValue & this.kidMask);
  } else {
    return this.tree[0].peekComplexValue(targetValue & this.kidMask);
  }
};
QBlock.prototype.peekComplexValue = function(targetValue) {
  if (this.gpuBlock) {
    var gpu_value = this.gpuBlock.peek_complex_value(targetValue);
    if (!webgl_blocks.side_by_side_checking) {
      return gpu_value;
    }
  }
  var index = targetValue * 2;
  value = new Vec2(this.values[index], this.values[index + 1]);
  if (this.gpuBlock && webgl_blocks.side_by_side_checking) {
    this.gpuBlock.side_by_side_check("peekComplexValue.x", null, gpu_value.x, value.x);
    this.gpuBlock.side_by_side_check("peekComplexValue.y", null, gpu_value.y, value.y);
  }
  return value;
};
QReg.prototype.pokeComplexValue = function(targetValue, x, y) {
  this.classicalBitsValid = 0;
  this.storage.pokeComplexValue(targetValue, x, y);
};
QRegNode.prototype.pokeComplexValue = function(targetValue, x, y) {
  if (targetValue & this.bitValue) {
    this.tree[1].pokeComplexValue(targetValue & this.kidMask, x, y);
  } else {
    this.tree[0].pokeComplexValue(targetValue & this.kidMask, x, y);
  }
};
QBlock.prototype.pokeComplexValue = function(targetValue, x, y) {
  var index = targetValue * 2;
  this.values[index] = x;
  this.values[index + 1] = y;
  if (this.gpuBlock && webgl_blocks.side_by_side_checking) {
    this.gpuBlock.side_by_side_check("pokeComplexValue", this.values);
  }
};
QReg.prototype.renormalize = function(length) {
  if (length == null) {
    length = Math.sqrt(this.storage.totalLengthSquared());
  }
  if (length == 0) {
    this.storage.initialize(0);
  } else {
    if (length != 1) {
      this.storage.scaleValues(1 / length);
    }
  }
};
var catLightColor = "#b8cce4";
var catDarkColor = "#548dd4";
function Rect(x, y, w, h) {
  this.x = x;
  this.y = y;
  this.w = w;
  this.h = h;
}
function Vec2(x, y) {
  this.x = x;
  this.y = y;
  this.length = function() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  };
  this.sqrLength = function() {
    return this.x * this.x + this.y * this.y;
  };
  this.normalize = function() {
    var len = this.length();
    if (len > 0) {
      this.x /= len;
      this.y /= len;
    }
  };
}
function fillCircle(ctx, x, y, radius, start_degrees, end_degrees, ccw) {
  if (start_degrees == null) {
    start_degrees = 0;
  }
  if (end_degrees == null) {
    end_degrees = 360;
  }
  if (ccw == null) {
    ccw = true;
  }
  var start_radians = start_degrees * Math.PI / 180;
  var end_radians = end_degrees * Math.PI / 180;
  ctx.beginPath();
  ctx.arc(x, y, radius, start_radians, end_radians, ccw);
  ctx.closePath();
  ctx.fill();
}
function strokeCircle(ctx, x, y, radius, start_degrees, end_degrees, ccw) {
  if (start_degrees == null) {
    start_degrees = 0;
  }
  if (end_degrees == null) {
    end_degrees = 360;
  }
  if (ccw == null) {
    ccw = true;
  }
  var start_radians = start_degrees * Math.PI / 180;
  var end_radians = end_degrees * Math.PI / 180;
  ctx.beginPath();
  ctx.arc(x, y, radius, start_radians, end_radians, ccw);
  ctx.closePath();
  ctx.stroke();
}
function drawKetText(ctx, text, x, y, lineWidth, textSize) {
  ctx.fillText(text, x, y);
  var w = ctx.measureText(text).width;
  var h = textSize - 2;
  var x1 = x - 2 - w / 2;
  var x2 = x + 2 + w / 2;
  var x3 = x2 + h / 4;
  var y1 = y + 4;
  var y2 = y1 + h / 2;
  var y3 = y1 + h;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1, y3);
  ctx.moveTo(x2, y1);
  ctx.lineTo(x3, y2);
  ctx.lineTo(x2, y3);
  ctx.stroke();
}
function QWidgetImage(name) {
  var img = new Image;
  img.src = name;
  img.onload = ImageLoaded;
  return img;
}
function SmallDial(x, y) {
  this.x = x;
  this.y = y;
  this.count = 0;
  return this;
}
function QStopwatch(qReg, bitMask, panel, pos) {
  this.qReg = qReg;
  this.panel = panel;
  this.bitMask = bitMask;
  this.pos = new Vec2(pos.x, pos.y);
  this.scale = 1;
  this.dialX = 294 * .5;
  this.dialY = 534 * .5;
  this.dialCenterPos = function() {
    return new Vec2(this.dialX * this.scale, this.dialY * this.scale);
  };
  this.dialRadius = 170 * .5;
  this.resultDial = new Array;
  this.resultDial.push(new SmallDial(368 * .5, 582 * .5));
  this.resultDial.push(new SmallDial(211 * .5, 530 * .5));
  this.dialBounce = true;
  this.imgOpen = new QWidgetImage("images/gold_watch_open8_301.png");
  this.imgClosed = new QWidgetImage("images/gold_watch_closed_301.png");
  qReg.widgets.push(this);
  panel.widgets.push(this);
  this.draw = function() {
    var ctx = this.panel.canvas.getContext("2d");
    ctx.save();
    var isOpen = this.qReg.classicalBitValid(this.bitMask);
    var img = this.imgClosed;
    if (isOpen) {
      img = this.imgOpen;
    }
    if (img != null && img.width > 0) {
      this.size = new Vec2(img.width * this.scale, img.height * this.scale);
      try {
        ctx.drawImage(img, this.pos.x, this.pos.y, this.size.x, this.size.y);
      } catch (e$0) {
      }
      if (isOpen || this.qReg.catVisible) {
        var cx = this.pos.x + this.scale * this.dialX;
        var cy = this.pos.y + this.scale * this.dialY;
        var handLength = this.scale * this.dialRadius;
        var thetaDeg = -30 + 90;
        if (isOpen) {
          if (this.qReg.classicalBit(this.bitMask)) {
            thetaDeg -= 90;
          }
        } else {
          thetaDeg -= 90 * this.qReg.peekQubitProbability(this.bitMask);
        }
        var thetaRad = thetaDeg * Math.PI / 180;
        var sval = Math.sin(thetaRad);
        var cval = Math.cos(thetaRad);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + sval * handLength, cy - cval * handLength);
        if (isOpen) {
          ctx.lineWidth = 1;
          ctx.strokeStyle = "#000000";
          ctx.stroke();
        } else {
          ctx.globalAlpha = .05;
          ctx.strokeStyle = "#ffffff";
          ctx.lineCap = "round";
          for (var i = 30;i > 2;i -= 2) {
            ctx.lineWidth = i;
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          ctx.strokeStyle = catLightColor;
          ctx.strokeStyle = catDarkColor;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.restore();
        if (isOpen) {
          for (var hand = 0;hand < 2;++hand) {
            var shortLengh = this.scale * 40 * .5;
            var thetaDeg = -30 + this.resultDial[hand].count * 360 / 60;
            var thetaRad = thetaDeg * Math.PI / 180;
            var sval = Math.sin(thetaRad);
            var cval = Math.cos(thetaRad);
            var cx = this.pos.x + this.scale * this.resultDial[hand].x;
            var cy = this.pos.y + this.scale * this.resultDial[hand].y;
            ctx.save();
            ctx.beginPath();
            ctx.lineTo(cx - sval * shortLengh * .5, cy + cval * shortLengh * .5);
            ctx.lineTo(cx + sval * shortLengh, cy - cval * shortLengh);
            ctx.lineWidth = 1;
            ctx.strokeStyle = "#000000";
            ctx.stroke();
            ctx.restore();
          }
        }
      }
    }
    ctx.restore();
  };
  this.changed = function() {
    this.draw();
  };
  this.message = function(msg, bitMask, arg1) {
    if ((bitMask & this.bitMask) != 0) {
      if (msg == "incrementResultDial") {
        if (arg1) {
          this.resultDial[1].count++;
        } else {
          this.resultDial[0].count++;
        }
        this.draw();
      }
    }
  };
  this.mouseDown = function(x, y) {
    if (x >= 0 && y >= 0 && x < this.size.x && y < this.size.y) {
      var dx = x - this.scale * this.dialX;
      var dy = y - this.scale * this.dialY;
      if (dx * dx + dy * dy <= this.scale * this.dialRadius * this.scale * this.dialRadius) {
        if (this.qReg.classicalBitValid(this.bitMask)) {
          this.qReg.invalidateClassicalBits(this.bitMask);
        } else {
          this.qReg.read(this.bitMask);
        }
        this.qReg.changed();
        return true;
      }
    }
    return false;
  };
  this.mouseUp = function(x, y) {
  };
  this.mouseMove = function(x, y) {
  };
}
function QCat(qReg, panel, pos) {
  this.qReg = qReg;
  this.panel = panel;
  this.scale = 1;
  this.pos = new Vec2(pos.x, pos.y);
  this.imgVisible = new QWidgetImage("images/cat_in_box_35.png");
  this.imgHidden = new QWidgetImage("images/opaque_box_35.png");
  qReg.widgets.push(this);
  panel.widgets.push(this);
  this.draw = function() {
    var ctx = this.panel.canvas.getContext("2d");
    ctx.save();
    var img = this.imgHidden;
    if (this.qReg.catVisible) {
      img = this.imgVisible;
    }
    if (img != null && img.width > 0) {
      this.size = new Vec2(img.width * this.scale, img.height * this.scale);
      try {
        ctx.drawImage(img, this.pos.x, this.pos.y, this.size.x, this.size.y);
      } catch (e$1) {
      }
    }
    ctx.restore();
  };
  this.changed = function() {
    this.draw();
  };
  this.message = function(msg, bitMask, arg1) {
  };
  this.mouseDown = function(x, y) {
    if (x >= 0 && y >= 0 && x < this.size.x && y < this.size.y) {
      this.qReg.toggleCat();
      return true;
    }
    return false;
  };
  this.mouseUp = function(x, y) {
  };
  this.mouseMove = function(x, y) {
  };
}
function QCharm(qReg, panel, pos, imageName) {
  this.qReg = qReg;
  this.panel = panel;
  this.scale = 1;
  this.pos = new Vec2(pos.x, pos.y);
  this.size = new Vec2(1, 1);
  this.labelSize = new Vec2(0, 0);
  this.isHovered = false;
  this.isClicked = false;
  this.image = new QWidgetImage(imageName);
  qReg.widgets.push(this);
  panel.widgets.push(this);
  this.draw = function() {
    var ctx = this.panel.canvas.getContext("2d");
    ctx.save();
    ctx.save();
    var centerx = this.pos.x + this.size.x * .5;
    var textHeight = this.labelSize.y;
    var textWidth = this.labelSize.x;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(this.pos.x, this.pos.y, this.size.x, this.size.y);
    ctx.fillRect(centerx - textWidth * .5, this.pos.y + this.size.y, textWidth, textHeight);
    ctx.restore();
    var img = this.image;
    if (img != null && img.width > 0) {
      this.size = new Vec2(img.width * this.scale, img.height * this.scale);
      try {
        ctx.drawImage(img, this.pos.x, this.pos.y, this.size.x, this.size.y);
      } catch (e$2) {
      }
      var hx = .5 * this.size.x;
      var hy = .5 * this.size.y;
      var cx = this.pos.x + hx;
      var cy = this.pos.y + hy;
      if (this.isClicked && this.isHovered) {
        ctx.save();
        ctx.fillStyle = "#ffffff";
        ctx.globalAlpha = .5;
        fillCircle(ctx, cx, cy, hx - 4, hy - 4);
        ctx.restore();
      }
      if (this.isClicked || this.isHovered) {
        ctx.font = "9px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        var x = cx;
        var y = this.pos.y + this.size.y;
        ctx.fillText(this.label, x, y);
        this.labelSize.x = ctx.measureText(this.label).width + 2;
        this.labelSize.y = 9 + 2;
      }
    }
    ctx.restore();
  };
  this.changed = function() {
    this.draw();
  };
  this.message = function(msg, bitMask, arg1) {
  };
  this.clickAction = function(x, y) {
  };
  this.checkHovered = function(x, y) {
    var radius = this.size.x * .5;
    var dx = x - radius;
    var dy = y - radius;
    this.isHovered = dx * dx + dy * dy <= radius * radius;
    return this.isHovered;
  };
  this.mouseDown = function(x, y) {
    var handled = false;
    if (this.checkHovered(x, y)) {
      this.isClicked = true;
      this.draw();
      handled = true;
    }
    return handled;
  };
  this.mouseUp = function(x, y) {
    var wasHovered = this.isHovered;
    var wasClicked = this.isClicked;
    if (this.checkHovered(x, y)) {
      if (this.isClicked) {
        this.clickAction(x, y);
      }
    }
    this.isClicked = false;
    if (wasHovered || wasClicked) {
      this.draw();
    }
    return false;
  };
  this.mouseMove = function(x, y) {
    var wasHovered = this.isHovered;
    if (this.checkHovered(x, y) != wasHovered) {
      this.draw();
    }
    return false;
  };
}
function QNotCharm(qReg, panel, pos, bitMask, label) {
  var charm = new QCharm(qReg, panel, pos, "images/not_charm_35.png");
  charm.bitMask = bitMask;
  charm.label = label;
  charm.clickAction = function(x, y) {
    if (charm.qReg.staff) {
      charm.qReg.staff.addInstructionAfterInsertionPoint("not", charm.bitMask, 0, 0);
    }
  };
  return charm;
}
function QRotateCharm(qReg, panel, pos, bitMask, label) {
  var charm = new QCharm(qReg, panel, pos, "http://machinelevel.com/qc/images/rotate_charm_35.png");
  charm.bitMask = bitMask;
  charm.label = label;
  charm.clickAction = function(x, y) {
    charm.qReg.rotate(charm.bitMask, 20);
  };
  return charm;
}
function QHadamardCharm(qReg, panel, pos, bitMask, label) {
  var charm = new QCharm(qReg, panel, pos, "images/hadamard_charm_35.png");
  charm.bitMask = bitMask;
  charm.label = label;
  charm.clickAction = function(x, y) {
    charm.qReg.hadamard(charm.bitMask);
  };
  return charm;
}
function QPhaseShiftCharm(qReg, panel, pos, bitMask, label) {
  var charm = new QCharm(qReg, panel, pos, "images/phase_charm_35.png");
  charm.bitMask = bitMask;
  charm.label = label;
  charm.clickAction = function(x, y) {
    charm.qReg.phaseShift(charm.bitMask, 20);
  };
  return charm;
}
function QCoinTossCharm(qReg, panel, pos, bitMask, label) {
  var charm = new QCharm(qReg, panel, pos, "images/cointoss_charm_35.png");
  charm.bitMask = bitMask;
  charm.label = label;
  charm.clickAction = function(x, y) {
    var wasObserved = charm.qReg.classicalBitValid(charm.bitMask);
    charm.qReg.read(charm.bitMask);
    charm.qReg.hadamard(charm.bitMask);
    charm.qReg.read(charm.bitMask);
    charm.qReg.message("incrementResultDial", charm.bitMask, charm.qReg.classicalBit(charm.bitMask));
    if (!wasObserved) {
      charm.qReg.invalidateClassicalBits(charm.bitMask);
    }
    charm.qReg.changed();
  };
  return charm;
}
function QChart(qReg, panel, pos) {
  this.qInt = null;
  this.qReg = qReg;
  this.panel = panel;
  this.pos = new Vec2(pos.x, pos.y);
  this.width = this.panel.canvas.width - pos.x;
  this.height = this.panel.canvas.height - pos.y;
  this.visible = true;
  this.in_use = true;
  this.margin = {x:10, y:30};
  this.prevXYValues = new Array;
  this.barTextSize = 14;
  this.barHeight = this.barTextSize + 10;
  this.scale = .75;
  this.baseScale = .5;
  this.wheelScale = 1;
  this.magScale = 1;
  this.autoMagScale = false;
  this.qReg.widgets.push(this);
  panel.widgets.push(this);
  this.calculateDimensions = function() {
    this.scale = this.baseScale;
    if (qc_options && qc_options.circle_scale) {
      this.scale = qc_options.circle_scale;
    }
    this.scale *= this.wheelScale;
    this.circleRadius = 50;
    this.columnWidth = this.circleRadius * 2.5;
    this.columnHeight = this.circleRadius * 2.5;
    this.width = 0;
    this.height = 0;
    if (this.fockState && !this.qReg.use_photon_sim) {
      return;
    }
    if (this.stabilizerState && !(this.qReg.chp && this.qReg.chp.active)) {
      return;
    }
    var space_between_widgets = 5;
    var total_height = space_between_widgets;
    var list = this.panel.widgets;
    for (var i = 0;i < list.length && list[i] != this;++i) {
      total_height += list[i].height + space_between_widgets;
    }
    this.pos.y = total_height;
    if (!this.in_use || this.pos.x >= this.panel.canvas.width || this.pos.y >= this.panel.canvas.height) {
      this.visible = false;
      return;
    }
    this.visible = true;
    this.width = this.panel.canvas.width - this.pos.x;
    this.height = this.panel.canvas.height - this.pos.y;
    var num_vals_to_draw = this.numValues;
    if (this.drawQInt) {
      num_vals_to_draw = 1 << this.drawQInt.numBits;
    } else {
      if (this.densityMatrix) {
        num_vals_to_draw *= num_vals_to_draw;
      } else {
        if (this.fockState) {
          this.qReg.photonSim.findNonZeroStates();
          num_vals_to_draw = this.qReg.photonSim.non_zero_states.length;
        } else {
          if (this.stabilizerState) {
            num_vals_to_draw = this.qReg.numQubits * this.qReg.numQubits * 2;
          }
        }
      }
    }
    this.numCols = this.width / (this.columnWidth * this.scale);
    this.numRows = this.height / (this.columnHeight * this.scale);
    var qubitsPerRow = -1;
    for (var i = 0;qubitsPerRow < 0;++i) {
      if (this.numCols < (1 << i + 1) * .75) {
        qubitsPerRow = i;
      }
    }
    this.numCols = 1 << qubitsPerRow;
    if (this.densityMatrix && this.numCols > this.numValues) {
      this.numCols = this.numValues;
    }
    if (this.stabilizerState) {
      this.numCols = 2 * this.qReg.numQubits;
      this.numRows = this.qReg.numQubits;
    }
    if (this.numCols > num_vals_to_draw) {
      this.numCols = num_vals_to_draw;
    }
    if (this.numRows > Math.ceil(num_vals_to_draw / this.numCols)) {
      this.numRows = Math.ceil(num_vals_to_draw / this.numCols);
    }
    this.numRows = Math.ceil(this.numRows);
    var usedWidth = this.margin.x + this.columnWidth * this.numCols / this.scale;
    var usedHeight = this.margin.y + this.columnHeight * this.numRows * this.scale;
    if (this.height > usedHeight) {
      this.height = usedHeight;
    }
    if (this.width > usedWidth) {
      this.width = usedWidth;
    }
    if (this.collapsed) {
      this.height = this.barHeight;
    }
  };
  this.rebuildIntMenu = function() {
    var need_redraw = false;
    var index = 0;
    this.panel.int_menu_select.options[index++] = new Option("raw register", "(raw)");
    var options = this.qReg.getQubitIntMenuArray();
    for (var i = 0;i < options.length;++i) {
      if (options[i].text.length > 0 && options[i].text[0] != "(") {
        this.panel.int_menu_select.options[index++] = options[i];
      }
    }
    panel.int_menu_select.options.length = index;
    panel.int_menu_select.onchange = this.selectIntMenu;
    var extra_widgets = 4;
    while (this.panel.widgets.length < this.qReg.qInts.length + extra_widgets) {
      new QChart(this.qReg, panel, new Vec2(0, 0));
      need_redraw = true;
    }
    var qints = this.qReg.qInts;
    var list = this.panel.widgets;
    var index = 0;
    for (var key in qints) {
      var qint = qints[key];
      list[index].in_use = true;
      list[index].drawQInt = qint;
      list[index].densityMatrix = false;
      list[index].fockState = false;
      list[index].stabilizerState = false;
      list[index].collapsed = true;
      index++;
    }
    list[index].in_use = true;
    list[index].drawQInt = null;
    list[index].densityMatrix = true;
    list[index].fockState = false;
    list[index].stabilizerState = false;
    list[index].collapsed = true;
    index++;
    list[index].in_use = true;
    list[index].drawQInt = null;
    list[index].densityMatrix = false;
    list[index].fockState = false;
    list[index].stabilizerState = false;
    list[index].collapsed = false;
    index++;
    list[index].in_use = true;
    list[index].drawQInt = null;
    list[index].densityMatrix = false;
    list[index].fockState = true;
    list[index].stabilizerState = false;
    list[index].collapsed = false;
    index++;
    list[index].in_use = true;
    list[index].drawQInt = null;
    list[index].densityMatrix = false;
    list[index].fockState = false;
    list[index].stabilizerState = true;
    list[index].collapsed = false;
    index++;
    while (index < list.length) {
      list[index++].in_use = false;
    }
  };
  this.selectIntMenu = function() {
    this.prevXYValues = new Array;
    DrawAllPanels();
  };
  this.circleItem = function() {
  };
  this.currCircleList = new Array;
  this.prevCircleList = new Array;
  this.panel.animationTotalTimeSec = .3;
  this.panel.animationRemainingTimeSec = 0;
  this.panel.animationIntervalMS = 30;
  this.panel.animationInstruction = null;
  this.qIntsChanged = function() {
    this.rebuildIntMenu();
  };
  this.drawValueCircle = function(ctx, x, y, cval, cval_array) {
    var probability = cval.sqrLength();
    var vector_len = cval ? cval.length() : 0;
    var tiny_vector_len = vector_len < 1E-6;
    var radius2 = this.circleRadius * vector_len * this.magScale;
    var lod_scale = .2;
    var tiny_scale = this.wheelScale < lod_scale;
    if (!tiny_vector_len) {
      if (qc_options.color_by_phase && !tiny_vector_len && !cval_array) {
        var r = 255 * .5 * (cval.x / vector_len + 1);
        var g = 255 - r;
        var b = 255 * .5 * (cval.y / vector_len + 1);
        ctx.fillStyle = "RGB(" + r.toFixed(0) + ", " + g.toFixed(0) + ", " + b.toFixed(0) + ")";
      } else {
        ctx.fillStyle = catLightColor;
      }
      if (tiny_scale) {
        ctx.fillRect(-radius2, -radius2, 2 * radius2, 2 * radius2);
      } else {
        fillCircle(ctx, 0, 0, radius2);
      }
    }
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#444";
    strokeCircle(ctx, 0, 0, this.circleRadius);
    if (!tiny_scale) {
      if (cval_array) {
        ctx.lineWidth = .25;
        ctx.strokeStyle = "black";
        ctx.beginPath();
        for (var i = 0;i < cval_array.length;++i) {
          var len = cval_array[i].length();
          ctx.moveTo(0, 0);
          ctx.lineTo(cval_array[i].y * this.circleRadius / len, -cval_array[i].x * this.circleRadius / len);
        }
        ctx.stroke();
      } else {
        if (radius2 > 0 && !tiny_vector_len) {
          ctx.lineWidth = .25;
          ctx.strokeStyle = "black";
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(cval.y * this.circleRadius / vector_len, -cval.x * this.circleRadius / vector_len);
          ctx.stroke();
        }
      }
    }
    if (radius2 > 0) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = catDarkColor;
      if (tiny_scale) {
        ctx.fillRect(-radius2, -radius2, 2 * radius2, 2 * radius2);
      } else {
        fillCircle(ctx, 0, 0, radius2);
      }
      if (!tiny_scale) {
        if (cval_array) {
        } else {
          if (!tiny_vector_len) {
            ctx.beginPath();
            ctx.lineTo(0, 0);
            ctx.lineTo(cval.y * this.magScale * this.circleRadius, -cval.x * this.magScale * this.circleRadius);
            ctx.stroke();
          }
        }
      }
    }
  };
  this.drawValueCircleText = function(ctx, x, y, cval, cval_array, ketVal) {
    var probability = cval.sqrLength();
    var textsize = 20;
    ctx.strokeStyle = "#000000";
    ctx.fillStyle = "#000000";
    ctx.font = "bold " + textsize + "px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    var x = 0;
    var y = 0 + this.circleRadius * 1.025;
    var lineHeight = 18;
    if (this.densityMatrix) {
      var dm_row = 0 | ketVal / this.numValues;
      var dm_col = ketVal % this.numValues;
      ketVal = "" + dm_row + ":" + dm_col;
    }
    drawKetText(ctx, ketVal, x, y, 1, textsize);
    x = y = 0;
    var y = 0 + .5 * this.circleRadius;
    ctx.globalAlpha = .25;
    ctx.fillText((probability * 100).toFixed(1) + "%", x, y);
    ctx.globalAlpha = 1;
  };
  this.drawXYCircles = function(ctx) {
    if (this.fockState && !this.qReg.use_photon_sim) {
      return;
    }
    if (this.stabilizerState && !(this.qReg.chp && this.qReg.chp.active)) {
      return;
    }
    ctx.save();
    ctx.fillStyle = "white";
    ctx.fillRect(this.pos.x, this.pos.y, this.width, this.height);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(this.pos.x, this.pos.y, this.width, this.height);
    ctx.clip();
    var str = "state vector";
    ctx.fillStyle = "#def";
    if (this.drawQInt) {
      str = this.drawQInt.name;
    } else {
      if (this.densityMatrix) {
        str = "density matrix";
      } else {
        if (this.fockState) {
          str = "Fock states";
          ctx.fillStyle = "#4f8";
          ctx.globalAlpha = .25;
        } else {
          if (this.stabilizerState) {
            str = "stabilizer state";
            ctx.fillStyle = "#C38EFF";
            ctx.globalAlpha = .25;
          }
        }
      }
    }
    ctx.font = "bold " + this.barTextSize + "px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    var x = this.pos.x;
    var y = this.pos.y;
    ctx.fillRect(x, y, this.width, this.barHeight);
    ctx.globalAlpha = 1;
    x += this.barHeight;
    y += 5;
    ctx.fillStyle = "black";
    ctx.fillText(str, x, y);
    var arrow_offset = this.barHeight / 2;
    var arrow_size = this.barHeight / 4;
    var rx = arrow_size * .6;
    var ry = arrow_size * 1;
    var cx = this.pos.x + arrow_offset;
    var cy = this.pos.y + arrow_offset;
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (this.collapsed) {
      ctx.moveTo(cx - rx, cy - ry);
      ctx.lineTo(cx - rx, cy + ry);
      ctx.lineTo(cx + rx, cy);
      ctx.lineTo(cx - rx, cy - ry);
    } else {
      ctx.moveTo(cx - ry, cy - rx);
      ctx.lineTo(cx + ry, cy - rx);
      ctx.lineTo(cx, cy + rx);
      ctx.lineTo(cx - ry, cy - rx);
    }
    ctx.stroke();
    ctx.lineWidth = 1;
    this.collapse_x = cx - this.pos.x;
    this.collapse_y = cy - this.pos.y;
    ctx.restore();
    if (this.collapsed) {
      return;
    }
    ctx.save();
    ctx.translate(this.pos.x + this.margin.x, this.pos.y + this.margin.y);
    ctx.scale(this.scale, this.scale);
    ctx.translate(this.circleRadius, this.circleRadius);
    var probability;
    var xy = new Vec2(0, 0);
    ctx.lineWidth = 1;
    var firstCol = 0;
    var firstRow = 0;
    var numRows = this.numRows;
    var numCols = this.numCols;
    var dataSource = this.qReg;
    if (this.qInt && this.qInt.valid) {
      dataSource = this.qInt;
    }
    var animT = 0;
    var animSin = 0;
    var animCos = 0;
    var animOffset = 0;
    var animating = false;
    var animSideOffset = 0;
    if (this.panel.animationRemainingTimeSec > 0) {
      animating = true;
      animT = this.panel.animationRemainingTimeSec / this.panel.animationTotalTimeSec;
      animSin = Math.sin(animT * Math.PI);
      animCos = Math.cos(animT * Math.PI);
      animSideOffset = .15 * animSin;
      animOffset = .5 * (1 - animCos);
    }
    if (this.autoMagScale) {
      this.magScale = 1;
      var maxMag = 0;
      for (var row = 0;row < numRows;++row) {
        for (var col = 0;col < numCols;++col) {
          var val = row * numCols + col;
          if (val < this.numValues) {
            var xy = dataSource.peekComplexValue(val);
            maxMag = Math.max(Math.abs(xy.x), Math.max(Math.abs(xy.y), maxMag));
          }
        }
      }
      if (maxMag > 0) {
        this.magScale = 1 / maxMag;
      }
    }
    var num_vals_to_draw = this.numValues;
    if (this.drawQInt) {
      num_vals_to_draw = 1 << this.drawQInt.numBits;
    } else {
      if (this.densityMatrix) {
        num_vals_to_draw *= num_vals_to_draw;
      } else {
        if (this.fockState) {
          num_vals_to_draw = this.qReg.photonSim.non_zero_states.length;
        } else {
          if (this.stabilizerState) {
            num_vals_to_draw = this.qReg.numQubits * this.qReg.numQubits * 2;
          }
        }
      }
    }
    var dm_row;
    var dm_col;
    if (this.stabilizerState) {
      ctx.save();
      ctx.font = "48px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      var x_table = this.qReg.chp.qstate.x;
      var z_table = this.qReg.chp.qstate.z;
      var letters = ["I", "X", "Z", "Y"];
      var colors = [null, "#9e9", "#9ee", "#ee9"];
      var num_qubits = this.qReg.numQubits;
      var cw = .4 * this.columnWidth;
      ctx.fillStyle = "#eee";
      ctx.fillRect(-.5 * cw, 0, .5 * numCols * cw, numRows * cw);
      ctx.fillRect((.5 * numCols + .5) * cw, 0, .5 * numCols * cw, numRows * cw);
      var x = 0;
      var y = 0;
      for (var row = 0;row < numRows;++row) {
        for (var col = 0;col < numCols;++col) {
          x = col * cw;
          y = row * cw;
          var tr = row;
          var tc = col;
          if (tc >= num_qubits) {
            x += cw;
            tr += num_qubits;
            tc -= num_qubits;
          }
          if (x * this.scale > this.width) {
            break;
          }
          var bits = 0;
          if (x_table[tr][tc >> 5] & 1 << (tc & 31)) {
            bits |= 1;
          }
          if (z_table[tr][tc >> 5] & 1 << (tc & 31)) {
            bits |= 2;
          }
          if (colors[bits]) {
            ctx.fillStyle = colors[bits];
            ctx.fillRect(x - .5 * cw, y, cw, cw);
          }
          if (this.scale > .1) {
            ctx.fillStyle = "black";
            ctx.fillText(letters[bits], x, y);
          }
        }
        if (y * this.scale > this.height) {
          break;
        }
      }
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#C38EFF";
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(cw * num_qubits, cw * .5);
      ctx.lineTo(cw * num_qubits, cw * (num_qubits + .5));
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();
    }
    for (var row = 0;row < numRows && !this.stabilizerState;++row) {
      ctx.save();
      for (var col = 0;col < numCols;++col) {
        var val = row * numCols + col;
        if (this.densityMatrix) {
          val = row * this.numValues + col;
          dm_row = Math.floor(val / this.numValues);
          dm_col = val % this.numValues;
        }
        if (val >= num_vals_to_draw) {
          row = numRows;
          col = numCols;
        } else {
          var cval = null;
          var cval_array = null;
          if (this.drawQInt) {
            cval_array = [];
            var probability = this.drawQInt.peekProbability(val, cval_array);
            if (cval_array.length == 1) {
              cval = cval_array[0];
              cval_array = null;
            } else {
              cval = new Vec2(0, Math.sqrt(probability));
            }
          } else {
            if (this.fockState) {
              cval = this.qReg.photonSim.getNonZeroStateComplexMag(val);
            } else {
              if (this.densityMatrix) {
                if (dataSource.current_mix) {
                  cval = new Vec2(0, 0);
                  var total_mag = 0;
                  for (var m = 0;m < dataSource.current_mix.length;++m) {
                    var cm = dataSource.current_mix[m];
                    var mix_prob = cm[0];
                    var mix_reg = dataSource.mixed_states[cm[1]].reg;
                    var cval_col = mix_reg.peekComplexValue(dm_col);
                    var cval_row = mix_reg.peekComplexValue(dm_row);
                    cval_row.y = -cval_row.y;
                    cval.x += mix_prob * (cval_col.x * cval_row.x - cval_col.y * cval_row.y);
                    cval.y += mix_prob * (cval_col.x * cval_row.y + cval_col.y * cval_row.x);
                  }
                } else {
                  var cval_col = dataSource.peekComplexValue(dm_col);
                  var cval_row = dataSource.peekComplexValue(dm_row);
                  cval_row.y = -cval_row.y;
                  cval = new Vec2(cval_col.x * cval_row.x - cval_col.y * cval_row.y, cval_col.x * cval_row.y + cval_col.y * cval_row.x);
                }
              } else {
                if (dataSource.current_mix) {
                  cval_array = [];
                  cval = new Vec2(0, 0);
                  var total_mag = 0;
                  for (var m = 0;m < dataSource.current_mix.length;++m) {
                    var cm = dataSource.current_mix[m];
                    var mix_prob = cm[0];
                    var sqrt_mix_prob = Math.sqrt(mix_prob);
                    var mix_reg = dataSource.mixed_states[cm[1]].reg;
                    var this_val = mix_reg.peekComplexValue(val);
                    this_val.x *= sqrt_mix_prob;
                    this_val.y *= sqrt_mix_prob;
                    var this_prob = this_val.x * this_val.x + this_val.y * this_val.y;
                    if (this_prob) {
                      cval_array.push(this_val);
                      total_mag += this_prob;
                    }
                  }
                  if (cval_array.length == 1) {
                    cval = cval_array[0];
                    cval_array = null;
                  } else {
                    cval = new Vec2(0, Math.sqrt(total_mag));
                  }
                } else {
                  cval = dataSource.peekComplexValue(val);
                }
              }
            }
          }
          if (this.wasAnimating && !animating) {
            this.prevXYValues[val] = cval;
          }
          ctx.save();
          if (animating) {
            if (this.panel.animationInstruction && (this.panel.animationInstruction.op == "not" || this.panel.animationInstruction.op == "cnot")) {
              var cond32 = this.panel.animationInstruction.conditionQubits.getBits(0);
              var targ32 = this.panel.animationInstruction.targetQubits.getBits(0);
              if (isAllZero(this.panel.animationInstruction.conditionQubits) || (val & cond32) == cond32) {
                var destX = 0;
                var destY = 0;
                for (var tq = 0;tq < this.qReg.numQubits;++tq) {
                  var targetQubit = 1 << tq;
                  if (targetQubit & targ32) {
                    var direction = 1;
                    if (val & targetQubit) {
                      direction = -1;
                    }
                    if (targetQubit >= numCols) {
                      destY += direction * this.columnHeight * (targetQubit / numCols);
                    } else {
                      destX += direction * this.columnWidth * targetQubit;
                    }
                  }
                }
                var tx = animOffset * destX + animSideOffset * destY;
                var ty = animOffset * destY + animSideOffset * destX;
                ctx.translate(tx, ty);
              }
            } else {
              var prevXY = this.prevXYValues[val];
              if (prevXY != null && cval) {
                cval.x = animOffset * prevXY.x + (1 - animOffset) * cval.x;
                cval.y = animOffset * prevXY.y + (1 - animOffset) * cval.y;
              }
            }
          }
          this.drawValueCircle(ctx, 0, 0, cval, cval_array);
          ctx.restore();
          if (this.wheelScale > .4) {
            if (this.fockState) {
              this.drawValueCircleText(ctx, 0, 0, cval, cval_array, this.qReg.photonSim.getNonZeroStateLabel(val));
            } else {
              this.drawValueCircleText(ctx, 0, 0, cval, cval_array, val);
            }
          }
          ctx.translate(this.columnWidth, 0);
        }
      }
      ctx.restore();
      ctx.translate(0, this.columnHeight);
    }
    this.wasAnimating = animating;
    ctx.restore();
  };
  this.drawPP = function(ctx) {
    if (!this.visible) {
      return;
    }
    ctx.fillStyle = "#e0e0e0";
    ctx.fillRect(0, 0, this.size.x, this.size.y);
    var cx = this.margin.x;
    var cy = this.margin.y + this.rowHeight;
    var probabllity;
    var xy = new Vec2(0, 0);
    ctx.lineWidth = 1;
    for (var col = 0;col < this.numValues;++col) {
      probability = dataSource.getValueProbability(col);
      ctx.fillStyle = catDarkColor;
      ctx.fillRect(cx + 1, cy + 1 - this.rowHeight * probability, this.columnWidth, this.rowHeight * probability);
      ctx.fillStyle = catLightColor;
      ctx.fillRect(cx, cy - this.rowHeight * probability, this.columnWidth, this.rowHeight * probability);
      ctx.save();
      xy.x = dataSource.getValueX(col);
      xy.y = dataSource.getValueY(col);
      xy.normalize();
      var radius = this.columnWidth * .6;
      var rx = cx + this.columnWidth * .5;
      var ry = cy + this.margin.y + radius;
      strokeCircle(ctx, rx, ry, radius);
      ctx.beginPath();
      ctx.lineTo(rx, ry);
      ctx.lineTo(rx + xy.x * radius, ry + xy.y * radius);
      ctx.stroke();
      ctx.restore();
      cx += this.columnWidth;
    }
  };
  this.draw = function() {
    if (this.qInt && this.qInt.valid) {
      this.numValues = 1 << this.qInt.numBits;
    } else {
      this.numValues = 1 << this.qReg.numQubits;
    }
    this.calculateDimensions();
    if (!this.visible) {
      return;
    }
    var ctx = this.panel.canvas.getContext("2d");
    this.drawXYCircles(ctx);
  };
  this.changed = function() {
    this.draw();
  };
  this.message = function(msg, bitMask, arg1) {
  };
  this.mouseWheel = function(e) {
    if (e.ctrlKey == true) {
      var dy = e.deltaY;
      if (dy > 0) {
        this.wheelScale *= .9;
      }
      if (dy < 0) {
        this.wheelScale *= 1.1;
      }
      if (this.wheelScale < .1) {
        this.wheelScale = .1;
      }
      if (this.wheelScale > 3) {
        this.wheelScale = 3;
      }
      this.panel.draw();
      return false;
    } else {
      if (e.shiftKey == true) {
        var dy = e.deltaX;
        if (dy > 0) {
          this.magScale *= .9;
        }
        if (dy < 0) {
          this.magScale *= 1.1;
        }
        if (this.magScale < 1) {
          this.magScale = 1;
        }
        if (this.magScale > 10) {
          this.magScale = 10;
        }
        this.panel.draw();
        return false;
      }
    }
    return false;
  };
  this.mouseDown = function(x, y) {
    var radius = 15;
    var dx = x - this.collapse_x;
    var dy = y - this.collapse_y;
    if (dx * dx + dy * dy < radius * radius) {
      this.collapsed = !this.collapsed;
      this.panel.draw();
      return true;
    }
    return false;
  };
  this.mouseUp = function(x, y) {
    return false;
  };
  this.mouseMove = function(x, y) {
    return false;
  };
}
;BlockJob = function() {
  this.setup = function(instruction, qBlock1, qBlock2) {
    this.instruction = instruction;
    this.qBlock1 = qBlock1;
    this.qBlock2 = qBlock2;
    this.started = false;
    this.finished = false;
  };
  this.start = function() {
  };
};
var qc_options = {};
function QInstruction(op, targetQubits, conditionQubits, theta, codeLabel, auxQubits) {
  this.qReg = null;
  this.op = op;
  if (targetQubits == null) {
    targetQubits = 0;
  }
  if (conditionQubits == null) {
    conditionQubits = 0;
  }
  if (auxQubits == null) {
    auxQubits = 0;
  }
  this.targetQubits = new BitField(targetQubits);
  this.conditionQubits = new BitField(conditionQubits);
  if (auxQubits) {
    this.auxQubits = new BitField(auxQubits);
  }
  this.codeLabel = codeLabel;
  if (op == "write" || op == "postselect") {
    this.writeValue = conditionQubits;
    this.conditionQubits.set(0);
  }
  this.theta = theta;
  this.blockJobs = new Array;
  this.blockJobsInUse = 0;
  this.firstWaitingBlockJob = 0;
  this.started = false;
  this.finished = false;
  this.execute = function(qReg, direction) {
    if (direction == null) {
      direction = 1;
    }
    this.qReg = qReg;
    this.blockJobsInUse = 0;
    this.firstWaitingBlockJob = 0;
    qReg.currentInstruction = this;
    this.started = true;
    this.finished = false;
    this.qReg.noise_level = 0;
    this.noise_level = 0;
    if (op == "not") {
      qReg.not(this.targetQubits);
    } else {
      if (op == "cnot") {
        qReg.cnot(this.targetQubits, this.conditionQubits);
      } else {
        if (op == "exchange") {
          qReg.exchange(this.targetQubits, this.conditionQubits);
        } else {
          if (op == "hadamard") {
            qReg.chadamard(this.targetQubits, this.conditionQubits);
          } else {
            if (op == "chadamard") {
              qReg.chadamard(this.targetQubits, this.conditionQubits);
            } else {
              if (op == "rotatex") {
                qReg.rotatex(this.targetQubits, theta * direction);
              } else {
                if (op == "crotatex") {
                  qReg.crotatex(this.targetQubits, this.conditionQubits, theta * direction);
                } else {
                  if (op == "rotatey") {
                    qReg.rotatey(this.targetQubits, theta * direction);
                  } else {
                    if (op == "crotatey") {
                      qReg.crotatey(this.targetQubits, this.conditionQubits, theta * direction);
                    } else {
                      if (op == "crootnot" && direction > 0 || op == "crootnot_inv" && direction < 0) {
                        qReg.crootnot(this.targetQubits, this.conditionQubits);
                      } else {
                        if (op == "crootnot_inv" && direction > 0 || op == "crootnot" && direction < 0) {
                          qReg.crootnot_inv(this.targetQubits, this.conditionQubits);
                        } else {
                          if (op == "rootexchange" && direction > 0 || op == "rootexchange_inv" && direction < 0) {
                            qReg.rootexchange(this.targetQubits, this.conditionQubits);
                          } else {
                            if (op == "rootexchange_inv" && direction > 0 || op == "rootexchange" && direction < 0) {
                              qReg.rootexchange(this.targetQubits, this.conditionQubits);
                            } else {
                              if (op == "noise") {
                                qReg.noise(this.theta, this.targetQubits);
                              } else {
                                if (op == "phase") {
                                  qReg.phaseShift(this.conditionQubits, this.theta * direction);
                                } else {
                                  if (op == "optical_phase") {
                                    qReg.optical_phase(this.conditionQubits, this.theta * direction);
                                  } else {
                                    if (op == "optical_beamsplitter") {
                                      qReg.optical_beamsplitter(this.targetQubits, this.theta * direction);
                                    } else {
                                      if (op == "coptical_beamsplitter") {
                                        qReg.coptical_beamsplitter(this.targetQubits, this.conditionQubits, this.theta * direction);
                                      } else {
                                        if (op == "read" && direction > 0) {
                                          this.recentReadValue = qReg.read(this.targetQubits, false, false);
                                        } else {
                                          if (op == "write" && direction > 0) {
                                            qReg.write(this.targetQubits, this.writeValue);
                                          } else {
                                            if (op == "postselect" && direction > 0) {
                                              qReg.postselect(this.targetQubits, this.writeValue);
                                            } else {
                                              if (op == "postselect_qubit_pair" && direction > 0) {
                                                qReg.postselect_qubit_pair(this.targetQubits);
                                              } else {
                                                if (op == "dual_rail_beamsplitter") {
                                                  qReg.dual_rail_beamsplitter(this.targetQubits, this.conditionQubits, this.theta * direction, this.auxQubits);
                                                } else {
                                                  if (op == "pair_source") {
                                                    qReg.pair_source(this.targetQubits, this.conditionQubits, 0);
                                                  } else {
                                                    if (op == "polarization_grating_in") {
                                                      qReg.polarization_grating_in(this.targetQubits, this.conditionQubits, this.theta * direction);
                                                    } else {
                                                      if (op == "polarization_grating_out") {
                                                        qReg.polarization_grating_out(this.targetQubits, this.conditionQubits, this.theta * direction);
                                                      } else {
                                                        if (op == "discard") {
                                                        } else {
                                                          if (op == "nop") {
                                                          } else {
                                                            if (op == "start_photon_sim") {
                                                              qReg.startPhotonSim(this.targetQubits, this);
                                                            } else {
                                                              if (op == "stop_photon_sim") {
                                                                qReg.stopPhotonSim(this.targetQubits, this);
                                                              } else {
                                                                if (op == "start_chp_sim") {
                                                                  qReg.startCHPSim(this.targetQubits, this);
                                                                } else {
                                                                  if (op == "stop_chp_sim") {
                                                                    qReg.stopCHPSim(this.targetQubits, this);
                                                                  } else {
                                                                    if (op == "push_mixed") {
                                                                      qReg.pushMixedState(this.targetQubits, this.theta, this);
                                                                    } else {
                                                                      if (op == "use_mixed") {
                                                                        qReg.useMixedState(this.targetQubits, this.theta, this);
                                                                      } else {
                                                                        if (op == "peek") {
                                                                          var high = this.targetQubits.getHighestBitIndex();
                                                                          var low = this.targetQubits.getLowestBitIndex();
                                                                          this.recentPeekValues = [];
                                                                          for (var bit = 0;bit < low;++bit) {
                                                                            this.recentPeekValues.push(null);
                                                                          }
                                                                          for (var bit = low;bit <= high;++bit) {
                                                                            this.recentPeekValues.push(qReg.peekQubitProbability(1 << bit));
                                                                          }
                                                                        }
                                                                      }
                                                                    }
                                                                  }
                                                                }
                                                              }
                                                            }
                                                          }
                                                        }
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    this.noise_level = this.qReg.noise_level;
    this.finish();
  };
  this.nextBlockJob = function(qBlock1, qBlock2) {
    var bj;
    if (this.blockJobsInUse < this.blockJobs.length) {
      bj = this.blockJobs[this.blockJobsInUse];
    } else {
      bj = new BlockJob;
      this.blockJobs.push(bj);
    }
    this.blockJobsInUse++;
    bj.setup(this, qBlock1, qBlock2);
  };
  this.serviceBlockJobs = function(qReg) {
    if (this.isFinished()) {
      return 0;
    }
    for (var i = this.firstWaitingBlockJob;i < this.blockJobsInUse;++i) {
      if (this.blockJobs[i].started) {
        this.blockJobs[i].start();
        this.firstWaitingBlockJob = i + 1;
        return this.firstWaitingBlockJob - i;
      }
    }
    this.setFinished();
    return 0;
  };
  this.isFinished = function() {
    return !this.qReg;
  };
  this.setFinished = function() {
    this.started = true;
    this.finished = true;
    this.qReg.currentInstruction = null;
    this.qReg = null;
    this.blockJobsInUse = 0;
  };
  this.finish = function() {
    while (this.serviceBlockJobs() > 0) {
    }
  };
  this.draw = function(ctx, x, y, radius, qubitIndex, staff, instruction_x, slot) {
    ctx.lineWidth = 2;
    ctx.fillStyle = "white";
    if (this.op == "cnot" || this.op == "not") {
      fillCircle(ctx, x, y, radius);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.lineTo(x - radius, y);
      ctx.lineTo(x + radius, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y - radius);
      ctx.lineTo(x, y + radius);
      ctx.stroke();
      strokeCircle(ctx, x, y, radius);
    } else {
      if (this.op == "noise") {
        ctx.fillStyle = "#f00";
        fillCircle(ctx, x, y, radius * .4);
        ctx.fillStyle = "#fff";
      } else {
        if (this.op == "peek") {
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y - radius * .2);
          ctx.stroke();
          if (this.recentPeekValues && this.recentPeekValues.length > qubitIndex && this.recentPeekValues[qubitIndex] != null) {
            var val = this.recentPeekValues[qubitIndex];
            var val_1p = val.toFixed(1);
            var val_3p = val.toFixed(3);
            var str = "";
            if (parseFloat(val_3p) == parseFloat(val_1p)) {
              str += val_1p;
            } else {
              str += val_3p;
            }
            var label_font_size = 10;
            draw_text(ctx, str, x, y - radius * .2, label_font_size, "", "#48f", "center", "bottom");
          }
        } else {
          if (this.op == "stop_photon_sim") {
            var yr = staff.gridSize * .5;
            ctx.fillStyle = "#4f8";
            ctx.globalAlpha = .25;
            var dx = instruction_x - staff.start_photon_sim_x;
            ctx.fillRect(-dx, y - yr, dx, yr * 2);
            ctx.globalAlpha = .75;
            ctx.fillRect(x - .1 * radius, y - .5 * staff.gridSize, .2 * radius, staff.gridSize);
            ctx.globalAlpha = 1;
          } else {
            if (this.op == "start_photon_sim") {
              var yr = radius * 1;
              ctx.fillStyle = "#4f8";
              ctx.globalAlpha = .25;
              staff.start_photon_sim_x = instruction_x;
              ctx.globalAlpha = .75;
              ctx.fillRect(x - .1 * radius, y - .5 * staff.gridSize, .2 * radius, staff.gridSize);
              ctx.globalAlpha = 1;
            } else {
              if (this.op == "stop_chp_sim") {
                var yr = staff.gridSize * .5;
                ctx.fillStyle = "#C38EFF";
                ctx.globalAlpha = .25;
                var dx = instruction_x - staff.start_chp_sim_x;
                ctx.fillRect(-dx, y - yr, dx, yr * 2);
                ctx.globalAlpha = .75;
                ctx.fillRect(x - .1 * radius, y - .5 * staff.gridSize, .2 * radius, staff.gridSize);
                ctx.globalAlpha = 1;
              } else {
                if (this.op == "start_chp_sim") {
                  var yr = radius * 1;
                  ctx.fillStyle = "#C38EFF";
                  ctx.globalAlpha = .25;
                  staff.start_chp_sim_x = instruction_x;
                  ctx.globalAlpha = .75;
                  ctx.fillRect(x - .1 * radius, y - .5 * staff.gridSize, .2 * radius, staff.gridSize);
                  ctx.globalAlpha = 1;
                } else {
                  if (this.op == "postselect_qubit_pair") {
                    var xwidth = radius / .8;
                    var high = this.targetQubits.getHighestBitIndex();
                    var low = this.targetQubits.getLowestBitIndex();
                    if (high == low + 1) {
                      var yscale = 3;
                      var ydir = 1;
                      if (qubitIndex == low) {
                        ctx.save();
                        ctx.scale(1, yscale);
                        ctx.lineWidth = 1;
                        ctx.strokeStyle = "#08f";
                        strokeCircle(ctx, x, (y + ydir * .5 * staff.gridSize) / yscale, .5 * xwidth);
                        ctx.restore();
                      }
                    } else {
                      var yscale = 3;
                      ctx.save();
                      ctx.scale(1, yscale);
                      ctx.lineWidth = 1;
                      ctx.strokeStyle = "#08f";
                      strokeCircle(ctx, x, y / yscale, .25 * xwidth);
                      ctx.restore();
                    }
                  } else {
                    if (this.op == "pair_source") {
                      var high = this.targetQubits.getHighestBitIndex();
                      var low = this.targetQubits.getLowestBitIndex();
                      ctx.fillStyle = "#f20";
                      if (high == low) {
                        fillCircle(ctx, x, y, staff.gridSize * .3);
                      } else {
                        if (qubitIndex == low) {
                          fillCircle(ctx, x, y, staff.gridSize * .3, 0, 180);
                        } else {
                          if (qubitIndex == high) {
                            fillCircle(ctx, x, y, staff.gridSize * .3, 180, 0);
                          }
                        }
                      }
                    } else {
                      if (this.op == "exchange" || this.op == "rootexchange" || this.op == "rootexchange_inv" || this.op == "dual_rail_beamsplitter" || this.op == "polarization_grating_in" || this.op == "polarization_grating_out") {
                        var high = this.targetQubits.getHighestBitIndex();
                        var low = this.targetQubits.getLowestBitIndex();
                        if (high == low + 1) {
                          yd = radius * 2 * staff.double_line_space;
                          var xwidth = radius / .8;
                          ctx.lineWidth = 1;
                          ctx.fillStyle = "white";
                          ctx.strokeStyle = "white";
                          ctx.fillRect(x - radius, y - 1, radius * 2, 2);
                          ctx.strokeRect(x - radius, y - 1, radius * 2, 2);
                          ctx.fillRect(x - 1, y - radius, 2, radius * 2);
                          ctx.strokeRect(x - 1, y - radius, 2, radius * 2);
                          ctx.strokeStyle = "black";
                          ctx.beginPath();
                          if (this.op == "dual_rail_beamsplitter") {
                            var ydir = -1;
                            if (qubitIndex == low) {
                              ydir = 1;
                            }
                            ctx.moveTo(x - xwidth, y);
                            ctx.lineTo(x - .7 * xwidth, y + .2 * ydir * xwidth);
                            ctx.lineTo(x - .5 * xwidth, y + .6 * ydir * xwidth);
                            ctx.lineTo(x - .3 * xwidth, y + .8 * ydir * xwidth);
                            ctx.lineTo(x + .3 * xwidth, y + .8 * ydir * xwidth);
                            ctx.lineTo(x + .5 * xwidth, y + .6 * ydir * xwidth);
                            ctx.lineTo(x + .7 * xwidth, y + .2 * ydir * xwidth);
                            ctx.lineTo(x + xwidth, y);
                          } else {
                            if (this.op == "polarization_grating_in" || this.op == "polarization_grating_out") {
                              var xdir = -1;
                              var ydir = -1;
                              if (qubitIndex == low) {
                                ydir = 1;
                              }
                              if (this.op == "polarization_grating_in") {
                                xdir = 1;
                              }
                              if (qubitIndex == low && this.theta >= 0) {
                                ctx.moveTo(x - xdir * 1 * xwidth, y - 0 * ydir * xwidth);
                                ctx.lineTo(x - xdir * .5 * xwidth, y + .5 * ydir * xwidth);
                              } else {
                                if (qubitIndex == high && this.theta < 0) {
                                  ctx.moveTo(x - xdir * 1 * xwidth, y - 0 * ydir * xwidth);
                                  ctx.lineTo(x - xdir * .5 * xwidth, y + .5 * ydir * xwidth);
                                }
                              }
                              ctx.moveTo(x - 1 * xwidth, y + 1 * ydir * xwidth);
                              ctx.lineTo(x + 0 * xwidth, y - 0 * ydir * xwidth);
                              ctx.lineTo(x + 1 * xwidth, y + 1 * ydir * xwidth);
                              ctx.moveTo(x + xdir * 0 * xwidth, y - 0 * ydir * xwidth);
                              ctx.lineTo(x + xdir * 1 * xwidth, y + 0 * ydir * xwidth);
                              ctx.lineTo(x + xdir * .5 * xwidth, y + .5 * ydir * xwidth);
                              ctx.stroke();
                              ctx.strokeStyle = "#000";
                              ctx.lineWidth = .5;
                              ctx.beginPath();
                              for (var i = -.8;i < 1;i += .3) {
                                if (i < 0) {
                                  ctx.moveTo(x + i * xwidth, y - i * ydir * xwidth);
                                } else {
                                  ctx.moveTo(x + i * xwidth, y + i * ydir * xwidth);
                                }
                                ctx.lineTo(x + i * xwidth, y + 1 * ydir * xwidth);
                                if (i < 0) {
                                  ctx.moveTo(x + i * xwidth, y - i * ydir * xwidth);
                                  ctx.lineTo(x - i * xwidth, y - i * ydir * xwidth);
                                }
                              }
                              ctx.stroke();
                              ctx.beginPath();
                              ctx.strokeStyle = "black";
                              ctx.lineWidth = 1;
                            } else {
                              if (this.op == "polarization_grating_out") {
                                var ydir = -1;
                                if (qubitIndex == low) {
                                  ydir = 1;
                                }
                                ctx.moveTo(x - xwidth, y);
                                ctx.lineTo(x - .7 * xwidth, y + .2 * ydir * xwidth);
                                ctx.lineTo(x - .5 * xwidth, y + .6 * ydir * xwidth);
                                ctx.lineTo(x - .3 * xwidth, y + .8 * ydir * xwidth);
                              } else {
                                var ym = y - xwidth;
                                if (qubitIndex == low) {
                                  ym = y + xwidth;
                                }
                                yd = radius * 2 * staff.double_line_space;
                                if (0 && staff.draw_double_lines) {
                                  ctx.moveTo(x - xwidth, y - yd);
                                  ctx.lineTo(0, ym - yd);
                                  ctx.lineTo(x + xwidth, y - yd);
                                  ctx.moveTo(x - xwidth, y + yd);
                                  ctx.lineTo(0, ym + yd);
                                  ctx.lineTo(x + xwidth, y + yd);
                                } else {
                                  var drawSlope_down = staff.wire_grid[slot].getBit(low);
                                  var drawSlope_up = staff.wire_grid[slot].getBit(high);
                                  var draw_a = drawSlope_down;
                                  var draw_b = drawSlope_up;
                                  if (qubitIndex == high) {
                                    draw_b = drawSlope_down;
                                    draw_a = drawSlope_up;
                                  }
                                  if (draw_a) {
                                    ctx.moveTo(x - xwidth, y);
                                    ctx.lineTo(0, ym);
                                  }
                                  if (draw_b) {
                                    ctx.moveTo(0, ym);
                                    ctx.lineTo(x + xwidth, y);
                                  }
                                }
                              }
                            }
                          }
                          ctx.stroke();
                          if (!isAllZero(this.conditionQubits)) {
                            ctx.lineWidth = 2;
                            ctx.beginPath();
                            if (qubitIndex == low) {
                              ctx.moveTo(x - xwidth * .5, y + xwidth * .5);
                              ctx.lineTo(0, y + xwidth * 1);
                              ctx.lineTo(x + xwidth * .5, y + xwidth * .5);
                            } else {
                              ctx.moveTo(x - xwidth * .5, y - xwidth * .5);
                              ctx.lineTo(0, y - xwidth * 1);
                              ctx.lineTo(x + xwidth * .5, y - xwidth * .5);
                            }
                            ctx.stroke();
                            var high_cond = this.conditionQubits.getHighestBitIndex();
                            var low_cond = this.conditionQubits.getLowestBitIndex();
                            var do_line = false;
                            if (qubitIndex == low) {
                              if (low_cond < low) {
                                do_line = true;
                              }
                            } else {
                              if (high_cond > high) {
                                do_line = true;
                              }
                              ctx.fillStyle = "black";
                              fillCircle(ctx, x, y - xwidth, xwidth * .25);
                            }
                            if (do_line) {
                              ctx.lineWidth = 2;
                              ctx.strokeStyle = "black";
                              ctx.beginPath();
                              ctx.moveTo(x, y + xwidth);
                              ctx.lineTo(x, y - xwidth);
                              ctx.stroke();
                            }
                          }
                          if (qubitIndex == high) {
                            if (this.op == "rootexchange" || this.op == "rootexchange_inv") {
                              ctx.save();
                              ctx.translate(x + xwidth, y - xwidth);
                              ctx.scale(.75, .75);
                              ctx.lineWidth = 1;
                              ctx.fillStyle = "white";
                              ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
                              ctx.strokeRect(-radius, -radius, radius * 2, radius * 2);
                              ctx.lineWidth = 2;
                              ctx.beginPath();
                              var hradx = .4 * radius;
                              var hrady = .6 * radius;
                              if (this.op == "rootexchange_inv") {
                                hradx = -hradx;
                              }
                              ctx.lineTo(-2 * hradx, .25 * hrady);
                              ctx.lineTo(-hradx, hrady);
                              ctx.lineTo(0, -hrady);
                              ctx.lineTo(2 * hradx, -hrady);
                              ctx.stroke();
                              ctx.restore();
                            }
                          }
                        } else {
                          var xwidth = radius * .75;
                          if (this.op == "dual_rail_beamsplitter") {
                            ctx.strokeStyle = "white";
                            ctx.lineWidth = 2;
                            ctx.beginPath();
                            ctx.moveTo(x - xwidth, y);
                            ctx.lineTo(x + xwidth, y);
                            ctx.stroke();
                            ctx.strokeStyle = "black";
                            ctx.lineWidth = 2;
                            ctx.beginPath();
                            ctx.moveTo(x - xwidth, y);
                            if (qubitIndex == high) {
                              ctx.lineTo(x - .5 * xwidth, y - .7 * xwidth);
                              ctx.lineTo(x + .5 * xwidth, y - .7 * xwidth);
                            } else {
                              ctx.lineTo(x - .5 * xwidth, y + .7 * xwidth);
                              ctx.lineTo(x + .5 * xwidth, y + .7 * xwidth);
                            }
                            ctx.lineTo(x + xwidth, y);
                            ctx.stroke();
                          } else {
                            var important_bits = 0;
                            if (staff.wire_grid[slot].getBit(high)) {
                              important_bits++;
                            }
                            if (staff.wire_grid[slot].getBit(low)) {
                              important_bits++;
                            }
                            if (important_bits == 2 || !isAllZero(this.conditionQubits)) {
                              ctx.lineWidth = 2;
                              ctx.beginPath();
                              ctx.moveTo(x - xwidth, y - xwidth);
                              ctx.lineTo(x + xwidth, y + xwidth);
                              ctx.moveTo(x - xwidth, y + xwidth);
                              ctx.lineTo(x + xwidth, y - xwidth);
                              ctx.stroke();
                            }
                          }
                          if (this.op == "rootexchange" || this.op == "rootexchange_inv") {
                            ctx.save();
                            ctx.translate(x + xwidth, y);
                            ctx.scale(.75, .75);
                            ctx.lineWidth = 1;
                            ctx.fillStyle = "white";
                            ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
                            ctx.strokeRect(-radius, -radius, radius * 2, radius * 2);
                            ctx.lineWidth = 2;
                            ctx.beginPath();
                            var hradx = .4 * radius;
                            var hrady = .6 * radius;
                            if (this.op == "rootexchange_inv") {
                              hradx = -hradx;
                            }
                            ctx.lineTo(-2 * hradx, .25 * hrady);
                            ctx.lineTo(-hradx, hrady);
                            ctx.lineTo(0, -hrady);
                            ctx.lineTo(2 * hradx, -hrady);
                            ctx.stroke();
                            ctx.restore();
                          }
                        }
                      } else {
                        if (this.op == "chadamard" || this.op == "hadamard") {
                          ctx.lineWidth = 1;
                          ctx.fillStyle = "white";
                          ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
                          ctx.strokeRect(x - radius, y - radius, radius * 2, radius * 2);
                          ctx.lineWidth = 2;
                          ctx.beginPath();
                          var hradx = .4 * radius;
                          var hrady = .6 * radius;
                          ctx.lineTo(x - hradx, y - hrady);
                          ctx.lineTo(x - hradx, y + hrady);
                          ctx.lineTo(x - hradx, y);
                          ctx.lineTo(x + hradx, y);
                          ctx.lineTo(x + hradx, y - hrady);
                          ctx.lineTo(x + hradx, y + hrady);
                          ctx.stroke();
                        } else {
                          if (this.op == "push_mixed" || this.op == "use_mixed") {
                            ctx.lineWidth = 1;
                            ctx.fillStyle = "white";
                            if (this.op == "use_mixed") {
                              ctx.fillRect(x - radius, y - radius, radius, radius * 2);
                              ctx.lineWidth = 1;
                              ctx.strokeStyle = "#FFA372";
                              ctx.beginPath();
                              ctx.moveTo(x - .5 * radius, y - .5 * staff.gridSize);
                              ctx.lineTo(x, y);
                              ctx.lineTo(x - .5 * radius, y + .5 * staff.gridSize);
                              ctx.stroke();
                            } else {
                              ctx.fillRect(x, y - radius, radius, radius * 2);
                              ctx.lineWidth = 1;
                              ctx.strokeStyle = "#FFA372";
                              ctx.beginPath();
                              ctx.moveTo(x - .5 * radius, y - .5 * staff.gridSize);
                              ctx.lineTo(x, y);
                              ctx.lineTo(x - .5 * radius, y + .5 * staff.gridSize);
                              ctx.stroke();
                            }
                          } else {
                            if (this.op == "optical_beamsplitter" || this.op == "coptical_beamsplitter") {
                              ctx.lineWidth = 1;
                              ctx.fillStyle = "white";
                              ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
                              ctx.lineWidth = 1;
                              ctx.beginPath();
                              var hradx = .5 * radius;
                              var hrady = .5 * radius;
                              ctx.moveTo(x - radius, y - hrady);
                              ctx.lineTo(x - hradx, y - hrady);
                              ctx.lineTo(x + hradx, y + hrady);
                              ctx.lineTo(x + radius, y + hrady);
                              ctx.moveTo(x - radius, y + hrady);
                              ctx.lineTo(x - hradx, y + hrady);
                              ctx.lineTo(x + hradx, y - hrady);
                              ctx.lineTo(x + radius, y - hrady);
                              ctx.stroke();
                              ctx.lineWidth = 1;
                              ctx.beginPath();
                              ctx.moveTo(x - hradx, y);
                              ctx.lineTo(x + hradx, y);
                              ctx.stroke();
                            } else {
                              if (this.op == "crotatex" || this.op == "rotatex" || this.op == "crotatey" || this.op == "rotatey") {
                                ctx.lineWidth = 1;
                                ctx.fillStyle = "white";
                                ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
                                ctx.strokeRect(x - radius, y - radius, radius * 2, radius * 2);
                                ctx.lineWidth = 2;
                                ctx.beginPath();
                                var hradx = .4 * radius;
                                var hrady = .6 * radius;
                                x -= hradx * 1;
                                hradx *= .7;
                                ctx.moveTo(x - hradx, y + hrady);
                                ctx.lineTo(x - hradx, y - hrady);
                                ctx.lineTo(x + hradx * .8, y - hrady);
                                ctx.lineTo(x + hradx, y - hrady * .75);
                                ctx.lineTo(x + hradx, y - hrady * .25);
                                ctx.lineTo(x + hradx * .8, y);
                                ctx.lineTo(x - hradx, y);
                                ctx.lineTo(x + hradx * 0, y);
                                ctx.lineTo(x + hradx, y + hrady);
                                ctx.stroke();
                                hradx = .4 * radius;
                                x += hradx * 2;
                                hradx *= .9;
                                y += hradx * 1;
                                hrady *= .7;
                                ctx.lineWidth = 1;
                                ctx.beginPath();
                                if (this.op == "crotatex" || this.op == "rotatex") {
                                  ctx.moveTo(x - hradx, y - hrady);
                                  ctx.lineTo(x + hradx, y + hrady);
                                  ctx.moveTo(x + hradx, y - hrady);
                                  ctx.lineTo(x - hradx, y + hrady);
                                } else {
                                  ctx.moveTo(x + hradx, y - hrady);
                                  ctx.lineTo(x, y);
                                  ctx.moveTo(x - hradx, y - hrady);
                                  ctx.lineTo(x, y);
                                  ctx.lineTo(x, y + hrady);
                                }
                                ctx.stroke();
                              } else {
                                if (this.op == "crootnot" || this.op == "crootnot_inv") {
                                  ctx.lineWidth = 1;
                                  ctx.fillStyle = "white";
                                  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
                                  ctx.strokeRect(x - radius, y - radius, radius * 2, radius * 2);
                                  ctx.lineWidth = 2;
                                  ctx.beginPath();
                                  var hradx = .4 * radius;
                                  var hrady = .6 * radius;
                                  if (this.op == "crootnot_inv") {
                                    hradx = -hradx;
                                  }
                                  ctx.lineTo(x - 2 * hradx, y + .25 * hrady);
                                  ctx.lineTo(x - hradx, y + hrady);
                                  ctx.lineTo(x, y - hrady);
                                  ctx.lineTo(x + 2 * hradx, y - hrady);
                                  ctx.stroke();
                                } else {
                                  if (this.op == "read" || this.op == "postselect") {
                                    ctx.fillStyle = "white";
                                    ctx.lineWidth = 1;
                                    ctx.fillRect(x - radius * .5, y - radius, radius * 1.5, radius * 2);
                                    if (1) {
                                      var radx = .99 * radius;
                                      if (this.op == "postselect" || qc_options.show_read_bit_values && this.recentReadValue != null) {
                                        var val = this.writeValue;
                                        ctx.fillStyle = "#ddd";
                                        if (this.op == "read") {
                                          ctx.strokeStyle = "#48f";
                                          val = getBit(this.recentReadValue, qubitIndex);
                                        }
                                        if (val) {
                                          ctx.fillStyle = "#ffa";
                                        }
                                        fillCircle(ctx, x - radius * .5, y, radx, 90, 270);
                                        ctx.fillStyle = "white";
                                        ctx.lineWidth = 1.5;
                                        if (val) {
                                          ctx.beginPath();
                                          ctx.moveTo(x, y - radx * .4);
                                          ctx.lineTo(x, y + radx * .4);
                                          ctx.stroke();
                                        } else {
                                          strokeCircle(ctx, x, y, radx * .3, 0, 360);
                                        }
                                        ctx.strokeStyle = "black";
                                        ctx.lineWidth = .25;
                                      }
                                      ctx.beginPath();
                                      var radx = .99 * radius;
                                      ctx.moveTo(x - radius * .5, y - radx);
                                      ctx.lineTo(x - radius * .5, y + radx);
                                      ctx.stroke();
                                      strokeCircle(ctx, x - radius * .5, y, radx, 90, 270);
                                      ctx.lineWidth = 1;
                                    } else {
                                      ctx.beginPath();
                                      var radx = .5 * radius;
                                      var rady = .7 * radius;
                                      ctx.lineTo(x + radx, y + rady);
                                      ctx.lineTo(x - radius, y);
                                      ctx.lineTo(x + radx, y - rady);
                                      ctx.stroke();
                                    }
                                  } else {
                                    if (this.op == "write") {
                                      ctx.fillStyle = "white";
                                      ctx.lineWidth = 1;
                                      var radx = .5 * radius;
                                      var rady = .7 * radius;
                                      if (qc_options.show_write_bit_values) {
                                        if (getBitfieldBit(this.writeValue, qubitIndex)) {
                                          ctx.fillStyle = "#ffa";
                                        }
                                      }
                                      ctx.lineWidth = 1;
                                      if (staff.draw_double_lines) {
                                        var xx = x + radius * .4;
                                        var y1 = y - radius * 2.5 * staff.double_line_space;
                                        var y2 = y + radius * 2.5 * staff.double_line_space;
                                        radx *= .8;
                                        rady *= .5;
                                        ctx.beginPath();
                                        ctx.moveTo(xx - radx, y1 + rady);
                                        ctx.lineTo(xx + radius, y1);
                                        ctx.lineTo(xx - radx, y1 - rady);
                                        ctx.moveTo(xx - radx, y2 + rady);
                                        ctx.lineTo(xx + radius, y2);
                                        ctx.lineTo(xx - radx, y2 - rady);
                                        ctx.fill();
                                        ctx.lineWidth = 1;
                                        ctx.strokeStyle = "black";
                                        ctx.stroke();
                                      } else {
                                        ctx.beginPath();
                                        ctx.moveTo(x - radx, y + rady);
                                        ctx.lineTo(x + radius, y);
                                        ctx.lineTo(x - radx, y - rady);
                                        ctx.fill();
                                        ctx.lineWidth = 1;
                                        ctx.strokeStyle = "black";
                                        ctx.stroke();
                                      }
                                      if (qc_options.show_write_bit_values) {
                                        ctx.lineWidth = 1.5;
                                        ctx.strokeStyle = "#48f";
                                        if (getBitfieldBit(this.writeValue, qubitIndex)) {
                                          ctx.beginPath();
                                          ctx.moveTo(x - radx * 1, y - radx * .7);
                                          ctx.lineTo(x - radx * 1, y + radx * .7);
                                          ctx.stroke();
                                        } else {
                                          strokeCircle(ctx, x - radx * 1, y, radx * .5, 0, 360);
                                        }
                                        ctx.strokeStyle = "black";
                                        ctx.lineWidth = 1;
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    if (this.noise_level > 0 && qc_options.draw_noise) {
      var level = this.noise_level / qc_options.noise_magnitude;
      var radial_grad = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.25);
      radial_grad.addColorStop(0, "rgba(255,100,0,255)");
      radial_grad.addColorStop(1, "rgba(255,0,0,0");
      ctx.globalAlpha = level;
      ctx.fillStyle = radial_grad;
      fillCircle(ctx, x, y, radius * 2.25);
      ctx.fillStyle = "#fff";
      ctx.globalAlpha = 1;
    }
  };
  this.drawBlockJobs = function(ctx, x, y, radius) {
    ctx.lineWidth = 1;
    ctx.fillStyle = "gray";
    for (var i = 0;i < this.blockJobsInUse;++i) {
      var bj = this.blockJobs[i];
      if (this.started && !this.finished) {
        if (bj.finished) {
          ctx.fillStyle = "green";
        } else {
          if (bj.started) {
            ctx.fillStyle = "yellow";
          } else {
            ctx.fillStyle = "red";
          }
        }
      }
      ctx.beginPath();
      ctx.lineTo(x - radius, y + 4 * i);
      ctx.lineTo(x + radius, y + 4 * i);
      ctx.stroke();
    }
  };
}
function QStaff(qReg, qPanel, pos) {
  this.qReg = qReg;
  this.qPanel = qPanel;
  qReg.staff = this;
  qPanel.staff = this;
  this.scale = 1;
  this.baseScale = 1;
  this.wheelScale = 1;
  this.margin_x = 20;
  this.margin_y = 50;
  this.gridSize = 20;
  this.photonic_view = false;
  this.classical_view = true;
  this.photonic_stretch = 1;
  this.gridSpacing = 4;
  this.numColumns = 20;
  this.nameWidth = 0;
  this.codeLabel = null;
  this.hoverInstruction = -1;
  this.do_advance_on_add = true;
  this.draw_double_lines = false;
  this.double_line_space = .2;
  this.pos = new Vec2(pos.x, pos.y);
  this.size = new Vec2(this.qPanel.canvas.width, this.qPanel.canvas.height);
  this.insertionStart = 0;
  this.instructions = new Array;
  this.instructions.push(new QInstruction("cnot", 1, 0, 0, this.codeLabel));
  this.instructions.push(new QInstruction("rotate", 1, 2, 0, this.codeLabel));
  this.instructions.push(new QInstruction("phaseshift", 1, 4, 0, this.codeLabel));
  this.trackingEnabled = true;
  qc_options.show_write_bit_values = true;
  qc_options.show_read_bit_values = true;
  qc_options.show_rotation_angle_values = true;
  qReg.widgets.push(this);
  qPanel.widgets.push(this);
  this.calculateScale = function() {
    this.scale = this.baseScale;
    this.scale *= this.wheelScale;
  };
  this.drawBits = function(ctx) {
    var font_size = 14;
    this.nameWidth = 0;
    var nameTextWidth = 0;
    var namePlaceWidth = 0;
    this.max_bits_to_draw = ctx.canvas.height / (this.gridSize * this.wheelScale);
    if (this.max_bits_to_draw > this.qReg.numQubits) {
      this.max_bits_to_draw = this.qReg.numQubits;
    }
    for (var bit = 0;bit < this.max_bits_to_draw;++bit) {
      var qubitName = this.qReg.getQubitIntName(bit);
      var qubitPlace = "0x" + this.qReg.getQubitIntPlace(bit);
      var x = 1.75 * radius;
      var y = 0;
      draw_text(ctx, "", x, y, font_size, "bold", "#000", "left", "middle");
      nameTextWidth = Math.max(nameTextWidth, ctx.measureText(qubitName).width);
      namePlaceWidth = Math.max(namePlaceWidth, ctx.measureText(qubitPlace).width);
    }
    this.nameWidth = 10 + nameTextWidth + namePlaceWidth;
    ctx.save();
    var oldName = null;
    for (var bit = 0;bit < this.max_bits_to_draw;++bit) {
      var radius = this.gridSize * .5 * .8;
      ctx.lineWidth = 1;
      if (0) {
        strokeCircle(ctx, 0, 0, radius);
        var bitMask = 1 << bit;
        var probability = this.qReg.peekQubitProbability(bitMask);
        var thetaDeg = -90 * (1 - probability);
        var thetaRad = thetaDeg * Math.PI / 180;
        var sval = Math.sin(thetaRad);
        var cval = Math.cos(thetaRad);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.lineTo(sval * -radius, cval * -radius);
        ctx.lineTo(sval * radius, cval * radius);
        ctx.stroke();
      }
      var x = 1.75 * radius + this.nameWidth;
      var y = 0;
      draw_text(ctx, "0x" + this.qReg.getQubitIntPlace(bit), x, y, font_size, "bold", "#000", "right", "middle");
      var qubitName = this.qReg.getQubitIntName(bit);
      if (qubitName != oldName) {
        oldName = qubitName;
        var sharedRows = 0;
        for (var rbit = bit + 1;rbit < this.max_bits_to_draw && this.qReg.getQubitIntName(rbit) == qubitName;rbit++) {
          sharedRows++;
        }
        x = 1.75 * radius + this.nameWidth - (10 + namePlaceWidth);
        y = this.gridSize * (sharedRows / 2);
        if (qubitName != "(util)") {
          draw_text(ctx, qubitName, x, y, font_size, "bold", "#000", "right", "middle");
        }
        ctx.save();
        ctx.strokeStyle = "rgba(0, 100, 125, 1.0)";
        ctx.lineWidth = 1;
        var cornerRadius = .5 * this.gridSize;
        rounded_rect_leftonly(ctx, x + 5, -.5 * this.gridSize, 10, this.gridSize * (sharedRows + 1), cornerRadius, true, false);
        ctx.restore();
      }
      ctx.translate(0, this.gridSize);
    }
    ctx.restore();
  };
  this.clear = function() {
    this.clearParallelization();
    this.draw_double_lines = false;
    this.insertionStart = 0;
    for (var i = 0;i < this.instructions.length;++i) {
      var inst = this.instructions[i];
      this.instructions[i] = null;
      delete inst;
    }
    this.instructions = new Array;
  };
  this.rewind_insertion_to_start = function() {
    this.qReg.use_photon_sim = false;
    this.qReg.mixed_states = null;
    this.qReg.current_mix = null;
    if (this.qReg.chp) {
      this.qReg.chp.active = false;
    }
    this.insertionStart = 0;
    for (var i = 0;i < this.instructions.length;++i) {
      var inst = this.instructions[i];
      inst.recentPeekValues = null;
      inst.recentReadValue = null;
    }
    this.qReg.setZero();
    this.qReg.pokeComplexValue(0, 1, 0);
    panel_chart.startAnimation(null);
  };
  this.removeInstruction = function(index) {
    this.clearParallelization();
    this.instructions.splice(index, 1);
    if (this.insertionStart >= index) {
      this.insertionStart--;
    }
  };
  this.insertInstruction = function(index, instr) {
    this.clearParallelization();
    this.checkSpecialInstructions(instr);
    this.instructions.splice(index, 0, instr);
    if (this.insertionStart >= index) {
      this.insertionStart++;
    }
    return instr;
  };
  this.appendInstruction = function(instr) {
    return this.insertInstruction(this.instructions.length, instr);
  };
  this.advanceOnAdd = function(enable) {
    this.do_advance_on_add = enable;
    if (enable) {
      this.advanceToEnd();
    }
  };
  this.advanceToEnd = function() {
    this.advance(this.instructions.length);
  };
  this.checkSpecialInstructions = function(inst) {
    if (!inst) {
      return;
    }
  };
  this.addInstructionAfterInsertionPoint = function(op_inst, targetQubits, conditionQubits, theta, auxQubits) {
    if (this.instructions.length > 1E6) {
      this.clear();
      this.disableTracking();
    }
    var inst = op_inst;
    if (op_inst.op != null) {
      inst = new QInstruction(inst.op, inst.targetQubits, inst.conditionQubits, inst.theta, this.codeLabel, auxQubits);
    } else {
      inst = new QInstruction(op_inst, targetQubits, conditionQubits, theta, this.codeLabel, auxQubits);
    }
    if (!this.trackingEnabled) {
      inst.execute(this.qReg, 1);
      return null;
    }
    this.checkSpecialInstructions(inst);
    this.instructions.splice(this.insertionStart, 0, inst);
    if (this.do_advance_on_add) {
      this.advance(1);
    }
    return inst;
  };
  this.enableTracking = function() {
    this.trackingEnabled = true;
  };
  this.disableTracking = function() {
    this.trackingEnabled = false;
  };
  this.runLabel = function(label) {
    var final_index = -1;
    for (var inst_index = 0;inst_index < this.instructions.length;++inst_index) {
      var inst = this.instructions[inst_index];
      if (inst.codeLabel == label) {
        inst.execute(this.qReg, 1);
        final_index = inst_index + 1;
      }
    }
    if (final_index < 0) {
      console.log('ERROR: No instructions with label "' + label + '" were found.');
      return false;
    }
    this.insertionStart = final_index;
    this.changed();
    return true;
  };
  this.repeatFromLabel = function(label) {
    for (var i = 0;i < this.instructions.length;++i) {
      var inst = this.instructions[i];
      if (inst.codeLabel == label) {
        this.insertionStart = i;
        this.advanceToEnd();
        return true;
      }
    }
    return false;
  };
  this.advance = function(count) {
    if (!this.trackingEnabled) {
      return;
    }
    if (count < 0 && !qc_options.allow_backward_eval) {
      var ok_to_go_backwards = false;
      if (count == -1 && !this.parallelized && this.insertionStart > 0) {
        var inst = this.instructions[this.insertionStart - 1];
        if (inst.op == "not" || inst.op == "cnot") {
          ok_to_go_backwards = true;
        }
      }
      if (!ok_to_go_backwards) {
        var pos = this.insertionStart + count;
        this.rewind_insertion_to_start();
        if (pos < 0) {
          pos = 0;
        }
        this.advance(pos);
        return;
      }
    }
    var direction = 1;
    if (count < 0) {
      direction = -1;
      count = -count;
    }
    var numSlots = this.instructions.length;
    if (this.instructions_parallel) {
      numSlots = this.instructions_parallel.length;
    }
    var instruction = null;
    var anim_val = this.qReg.animateWidgets;
    this.qReg.animateWidgets = false;
    for (var i = 0;i < count;++i) {
      if (i == count - 1) {
        this.qReg.animateWidgets = anim_val;
      }
      if (this.insertionStart == 0 && direction < 0) {
        return;
      }
      if (this.insertionStart == numSlots && direction > 0) {
        return;
      }
      var slot = this.insertionStart;
      if (direction < 0) {
        slot = this.insertionStart - 1;
        this.insertionStart--;
      } else {
        this.insertionStart++;
      }
      if (this.instructions_parallel) {
        for (var pinst = 0;pinst < this.instructions_parallel[slot].length;++pinst) {
          instruction = this.instructions_parallel[slot][pinst];
          instruction.execute(this.qReg, direction);
        }
      } else {
        instruction = this.instructions[slot];
        instruction.execute(this.qReg, direction);
      }
    }
    this.qReg.animateWidgets = anim_val;
    if (this.qReg.animateWidgets) {
      panel_chart.startAnimation(instruction);
    }
  };
  this.setCodeLabel = function(codeLabel) {
    this.codeLabel = codeLabel;
  };
  this.drawCodeLabels = function(ctx) {
    var gx = this.gridSize * this.photonic_stretch;
    var gy = this.gridSize;
    ctx.save();
    var currentLabel = null;
    var labelStartX = -1;
    var labelEndX = 0;
    for (var inst = 0;inst < this.instructions.length;++inst) {
      var instruction = this.instructions[inst];
      var thisLabel = instruction.codeLabel;
      var nextLabel = null;
      if (inst < this.instructions.length - 1) {
        nextLabel = this.instructions[inst + 1].codeLabel;
      }
      if (nextLabel == thisLabel) {
        labelEndX++;
      } else {
        if (thisLabel) {
          var gap = gx * .1;
          var x1 = labelStartX;
          var x2 = labelEndX;
          if (this.instructions_parallel) {
            x1 = 1E6;
            x2 = -1;
            for (var np = labelStartX;np <= labelEndX;++np) {
              if (np >= 0 && this.instructions[np].parallel_slot != null) {
                x1 = Math.min(x1, this.instructions[np].parallel_slot);
                x2 = Math.max(x2, this.instructions[np].parallel_slot);
                if (x1 == 0) {
                  x1 = -1;
                }
              }
            }
          }
          var x = gx * x1 + gap + gx * .5;
          var y = -1.3 * gy;
          var width = gx * (x2 - x1) - 2 * gap;
          var height = (this.qReg.numQubits + 1.3) * gy;
          var cornerRadius = this.gridSize * .5;
          var do_stroke = true;
          var do_fill = true;
          if (this.photonic_view) {
            do_fill = false;
          }
          ctx.save();
          ctx.strokeStyle = "rgba(0, 100, 125, 1.0)";
          ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
          rounded_rect(ctx, x, y, width, height, cornerRadius, false, do_fill);
          rounded_rect_nosides(ctx, x, y, width, height, cornerRadius, do_stroke, false);
          ctx.fillStyle = "rgba(0, 100, 125, 1.0)";
          var font_size = 12;
          var tx = x + .5 * width;
          var topy = y - 2;
          var boty = y + height + 3;
          draw_text(ctx, thisLabel, tx, topy, font_size, "", "rgba(0, 100, 125, 1.0)", "center", "bottom");
          draw_text(ctx, thisLabel, tx, boty, font_size, "", "rgba(0, 100, 125, 1.0)", "center", "top");
          ctx.restore();
        }
        labelStartX = labelEndX;
        labelEndX++;
        if (labelStartX * this.wheelScale > ctx.canvas.width) {
          break;
        }
      }
    }
    ctx.restore();
  };
  this.construct_LOJS = function() {
    var lojs = [];
    var xmax = 0;
    var ymax = 0;
    for (var inst = 0;inst < this.instructions.length;++inst) {
      var instruction = this.instructions[inst];
      var xpos = inst;
      var ypos = 0;
      if (instruction.parallel_slot != null) {
        xpos = instruction.parallel_slot;
      }
      var ratio = .5;
      for (var bit = 0;bit < this.qReg.numQubits;++bit) {
        if (instruction.targetQubits.getBit(bit)) {
          ypos = bit;
          break;
        }
      }
      if (instruction.op == "exchange" && isAllZero(instruction.conditionQubits)) {
        lojs.push({"type":"crossing", "x":xpos, "y":ypos});
      } else {
        if (instruction.op == "write") {
          lojs.push({"type":"fockstate", "x":xpos, "y":ypos, "n":1});
        } else {
          lojs.push({"type":"coupler", "x":xpos, "y":ypos, "ratio":ratio});
        }
      }
      xmax = Math.max(xpos, xmax);
      ymax = Math.max(ypos, ymax);
    }
    var xoff = Math.floor(xmax * .5);
    var yoff = Math.floor(ymax * .5);
    for (var i = 0;i < lojs.length;++i) {
      lojs[i].x -= xoff;
      lojs[i].y -= yoff;
    }
    return lojs;
  };
  this.old_construct_IPKISS = function() {
    var ipkiss = "";
    var xmax = 0;
    var ymax = 0;
    var xscale = 50;
    var yscale = 10;
    var indent = "        ";
    var num_slots = this.instructions.length;
    if (this.instructions_parallel) {
      num_slots = this.instructions_parallel.length;
    }
    var usage = [];
    for (var row = 0;row < this.qReg.numQubits;++row) {
      usage.push([]);
      for (var col = 0;col < num_slots;++col) {
        usage[row].push(false);
      }
    }
    for (var inst = 0;inst < this.instructions.length;++inst) {
      var instruction = this.instructions[inst];
      var xpos = inst;
      var ypos = 0;
      if (instruction.parallel_slot != null) {
        xpos = instruction.parallel_slot;
      }
      var ratio = .5;
      for (var bit = 0;bit < this.qReg.numQubits;++bit) {
        if (instruction.targetQubits.getBit(bit)) {
          ypos = bit;
          break;
        }
      }
      if (instruction.op == "beamsplitter" && isAllZero(instruction.conditionQubits)) {
        usage[ypos][xpos] = true;
        usage[ypos + 1][xpos] = true;
        var str = "";
        var x1 = xpos * xscale;
        var y1 = ypos * yscale;
        str += indent + "self.elems += SRef(self.coupler, position = (" + x1 + "," + y1 + "))\n";
        ipkiss += str;
      } else {
        if (instruction.op == "write") {
        } else {
        }
      }
      xmax = Math.max(xpos, xmax);
      ymax = Math.max(ypos, ymax);
    }
    for (var row = 0;row < usage.length;++row) {
      for (var col = 0;col < usage[row].length;++col) {
        if (!usage[row][col]) {
          var line_width = .5;
          var x1 = (col - .5) * xscale;
          var y1 = (row - .5) * yscale;
          var x2 = (col + .5) * xscale;
          var y2 = y1;
          var str = indent + "self.elems += Line(WG_LAYER,begin_coord = (" + x1.toFixed(6) + "," + y1.toFixed(6) + "), end_coord = (" + x2.toFixed(6) + "," + y2.toFixed(6) + "), line_width = " + line_width.toFixed(6) + ")\n";
          ipkiss += str;
        }
      }
    }
    console.log(ipkiss);
    return ipkiss;
  };
  this.construct_IPKISS = function() {
    var ipkiss = "";
    var xmax = 0;
    var ymax = 0;
    var xscale = 50;
    var yscale = 30;
    var xoff = 50;
    var yoff = 200;
    var indent = "        ";
    var num_slots = this.instructions.length;
    if (this.instructions_parallel) {
      num_slots = this.instructions_parallel.length;
    }
    for (var inst = 0;inst < this.instructions.length;++inst) {
      var instruction = this.instructions[inst];
      var xpos = inst;
      var ypos = 0;
      if (instruction.parallel_slot != null) {
        xpos = instruction.parallel_slot;
      }
      if (instruction.op == "write") {
        var str = "";
        for (var bit = 0;bit < this.qReg.numQubits;++bit) {
          if (instruction.targetQubits.getBit(bit)) {
            ypos = bit;
            str += indent + "rail_ports[" + ypos + "] = array.ports[next_grating]\n";
            str += indent + "next_grating += 1 \n";
          }
        }
        ipkiss += str;
      } else {
        if (instruction.op == "dual_rail_beamsplitter") {
          var low_pos = instruction.targetQubits.getLowestBitIndex();
          var high_pos = instruction.targetQubits.getHighestBitIndex();
          var is_mzi = false;
          if (inst < this.instructions.length - 2) {
            var instruction2 = this.instructions[inst + 1];
            var instruction3 = this.instructions[inst + 2];
            if (instruction2.op == "phase" && instruction3.op == "dual_rail_beamsplitter") {
              var ph_low = instruction2.conditionQubits.getLowestBitIndex();
              var ph_high = instruction2.conditionQubits.getHighestBitIndex();
              var bs_low = instruction3.targetQubits.getLowestBitIndex();
              var bs_high = instruction3.targetQubits.getHighestBitIndex();
              if (ph_low == ph_high && (ph_low == low_pos || ph_low == high_pos)) {
                if (bs_low == low_pos && bs_high == high_pos) {
                  is_mzi = true;
                }
              }
            }
          }
          var str = "";
          if (is_mzi) {
            var x1 = "xoffset + " + xpos + " * xscale";
            var y1 = "yoffset + " + .5 * (low_pos + high_pos) + " * yscale + coupler_width / 2";
            str += indent + "mzi = SRef(mzi_t, position = [" + x1 + "," + y1 + "])\n";
            str += indent + "elems += mzi\n";
            str += indent + "if rail_ports[" + high_pos + "]:\n";
            str += indent + "    elems += ManhattanWgConnector(rail_ports[" + high_pos + "], mzi.ports[0])\n";
            str += indent + "if rail_ports[" + low_pos + "]:\n";
            str += indent + "    elems += ManhattanWgConnector(rail_ports[" + low_pos + "], mzi.ports[1])\n";
            str += indent + "rail_ports[" + high_pos + "] = mzi.ports[2]\n";
            str += indent + "rail_ports[" + low_pos + "] = mzi.ports[3]\n";
            inst += 2;
          } else {
            var x1 = "xoffset + " + xpos + " * xscale";
            var y1 = "yoffset + " + .5 * (low_pos + high_pos) + " * yscale + coupler_width / 2";
            str += indent + "bs = SRef(bs_t, position = [" + x1 + "," + y1 + "])\n";
            str += indent + "elems += bs\n";
            str += indent + "if rail_ports[" + high_pos + "]:\n";
            str += indent + "    elems += ManhattanWgConnector(rail_ports[" + high_pos + "], bs.ports[0])\n";
            str += indent + "if rail_ports[" + low_pos + "]:\n";
            str += indent + "    elems += ManhattanWgConnector(rail_ports[" + low_pos + "], bs.ports[1])\n";
            str += indent + "rail_ports[" + high_pos + "] = bs.ports[2]\n";
            str += indent + "rail_ports[" + low_pos + "] = bs.ports[3]\n";
          }
          ipkiss += str;
        } else {
          if (instruction.op == "phase") {
            var low_pos = instruction.conditionQubits.getLowestBitIndex();
            var high_pos = instruction.conditionQubits.getHighestBitIndex();
            var str = "";
            var is_cz = false;
            if (low_pos != high_pos && instruction.theta > 179.9 && instruction.theta < 180.1) {
              is_cz = true;
            }
            if (is_cz) {
              var x1 = "xoffset + " + xpos + " * xscale";
              var y1 = "yoffset + " + .5 * (low_pos + high_pos) + " * yscale + coupler_width / 2";
              str += indent + "dc = SRef(dc_t, position = [" + x1 + "," + y1 + "])\n";
              str += indent + "elems += dc\n";
              str += indent + "if rail_ports[" + high_pos + "]:\n";
              str += indent + "    elems += ManhattanWgConnector(rail_ports[" + high_pos + "], dc.ports[0])\n";
              str += indent + "if rail_ports[" + low_pos + "]:\n";
              str += indent + "    elems += ManhattanWgConnector(rail_ports[" + low_pos + "], dc.ports[1])\n";
              str += indent + "rail_ports[" + high_pos + "] = dc.ports[2]\n";
              str += indent + "rail_ports[" + low_pos + "] = dc.ports[3]\n";
              var y1 = "yoffset + " + (low_pos - .5) + " * yscale + coupler_width / 2";
              str += indent + "dc = SRef(dc_t, position = [" + x1 + "," + y1 + "])\n";
              str += indent + "elems += dc\n";
              var y1 = "yoffset + " + (high_pos + .5) + " * yscale + coupler_width / 2";
              str += indent + "dc = SRef(dc_t, position = [" + x1 + "," + y1 + "])\n";
              str += indent + "elems += dc\n";
            } else {
              var x1 = "xoffset + " + xpos + " * xscale";
              var y1 = "yoffset + " + low_pos + " * yscale";
              if (1) {
                str += indent + "heater = SRef(heater_t, position = [" + x1 + "," + y1 + "])\n";
                str += indent + "elems += heater\n";
                str += indent + "if rail_ports[" + low_pos + "]:\n";
                str += indent + "    elems += ManhattanWgConnector(rail_ports[" + low_pos + "], heater.ports[0])\n";
                str += indent + "rail_ports[" + low_pos + "] = heater.ports[1]\n";
              } else {
                str += indent + "if rail_ports[" + low_pos + "]:\n";
                str += indent + "    elems += ConnectorToSouth(rail_ports[" + low_pos + "])\n";
                str += indent + "    elems += ConnectorToWest(elems[-1].ports[1],end_straight = 10.)\n";
                str += indent + "    elems += ConnectorToSouth(elems[-1].ports[1])                \n";
                str += indent + "    elems += ConnectorToEast(elems[-1].ports[1],end_straight = 44.)\n";
                str += indent + "    elems += ConnectorToNorth(elems[-1].ports[1])\n";
                str += indent + "    elems += ConnectorToWest(elems[-1].ports[1],end_straight = 10.)\n";
                str += indent + "    elems += ConnectorToNorth(elems[-1].ports[1])\n";
                str += indent + "    elems += ConnectorToEast(elems[-1].ports[1],end_straight = 10.)\n";
                str += indent + "    rail_ports[" + low_pos + "] = elems[-1].ports[1]\n";
              }
            }
            ipkiss += str;
          } else {
            if (instruction.op == "write") {
            } else {
            }
          }
        }
      }
      xmax = Math.max(xpos, xmax);
      ymax = Math.max(ypos, ymax);
    }
    console.log(ipkiss);
    return ipkiss;
  };
  this.drawInstructions = function(ctx, instructionRange) {
    ctx.save();
    var gx = this.gridSize * this.photonic_stretch;
    var gy = this.gridSize;
    for (var inst = 0;inst < this.instructions.length;++inst) {
      if (instructionRange) {
        if (inst < instructionRange[0] || inst > instructionRange[1]) {
          continue;
        }
      }
      ctx.save();
      var instruction = this.instructions[inst];
      var instruction_x = gx * inst;
      var slot = inst;
      if (instruction.parallel_slot != null) {
        instruction_x = gx * instruction.parallel_slot;
        instruction_x += 4 * instruction.parallel_offset;
        slot = instruction.parallel_slot;
      }
      if (instruction_x * this.wheelScale > ctx.canvas.width + this.gridSize) {
        ctx.restore();
        break;
      }
      ctx.translate(instruction_x, 0);
      var radius = this.gridSize * .5 * .8;
      var minBit = 1E3;
      var maxBit = -1E3;
      for (var bit = 0;bit < this.max_bits_to_draw;++bit) {
        if (instruction.targetQubits.getBit(bit) || instruction.conditionQubits.getBit(bit)) {
          if (minBit > bit) {
            minBit = bit;
          }
          if (maxBit < bit) {
            maxBit = bit;
          }
        }
      }
      if (!instruction.conditionQubits.isAllZero() || instruction.op == "exchange" || instruction.op == "rootexchange" || instruction.op == "rootexchange_inv" || instruction.op == "dual_rail_beamsplitter" || instruction.op == "postselect_qubit_pair" || instruction.op == "pair_source" || instruction.op == "polarization_grating_in" || instruction.op == "polarization_grating_out") {
        var dim = false;
        if (instruction.op == "phase" && instruction.theta == 0) {
          dim = true;
        }
        if (dim) {
          ctx.globalAlpha = .25;
        }
        if (minBit < maxBit) {
          if (instruction.op == "dual_rail_beamsplitter" || instruction.op == "postselect_qubit_pair" || instruction.op == "polarization_grating_in" || instruction.op == "polarization_grating_out") {
            if (minBit + 1 < maxBit) {
              ctx.lineWidth = .5;
              ctx.beginPath();
              ctx.moveTo(0, this.gridSize * (minBit + .25));
              ctx.lineTo(0, this.gridSize * (maxBit - .25));
              ctx.stroke();
            }
          } else {
            if (instruction.op == "pair_source") {
              var dx = this.gridSize * .08;
              ctx.lineWidth = 1;
              ctx.strokeStyle = "#08f";
              ctx.beginPath();
              ctx.moveTo(-dx, this.gridSize * minBit);
              ctx.lineTo(-dx, this.gridSize * maxBit);
              ctx.stroke();
              ctx.strokeStyle = "#f20";
              ctx.beginPath();
              ctx.moveTo(dx, this.gridSize * minBit);
              ctx.lineTo(dx, this.gridSize * maxBit);
              ctx.stroke();
            } else {
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(0, this.gridSize * minBit);
              ctx.lineTo(0, this.gridSize * maxBit);
              ctx.stroke();
            }
          }
        }
        if (dim) {
          ctx.globalAlpha = 1;
        }
      }
      if (qc_options.show_rotation_angle_values) {
        if (instruction.op == "optical_beamsplitter" || instruction.op == "coptical_beamsplitter" || instruction.op == "dual_rail_beamsplitter" || instruction.op == "optical_phase" || instruction.op == "phase" || instruction.op == "rotatex" || instruction.op == "rotatey" || instruction.op == "crotatex" || instruction.op == "crotatey") {
          ctx.save();
          ctx.font = "bold 11px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          var x = 0;
          var y = -this.gridSize * 1;
          var label = "";
          if (instruction.op == "optical_beamsplitter" || instruction.op == "coptical_beamsplitter" || instruction.op == "dual_rail_beamsplitter" || instruction.op == "pair_source") {
            var eta = instruction.theta.toFixed(1);
            if (instruction.theta * 100 % 10) {
              ctx.font = "bold 8px sans-serif";
              ctx.textBaseline = "middle";
              eta = instruction.theta.toFixed(2);
            }
            if (eta != .5) {
              label += eta;
            }
          } else {
            var special_phase = false;
            if (instruction.op == "phase") {
              if (instruction.conditionQubits.countOneBits() > 1) {
                if (instruction.theta == 180) {
                  special_phase = true;
                }
              }
            }
            if (!special_phase) {
              var theta = instruction.theta.toFixed(0);
              if (instruction.theta * 10 % 10) {
                ctx.font = "bold 8px sans-serif";
                ctx.textBaseline = "middle";
                theta = instruction.theta.toFixed(1);
              }
              label += theta;
              label += "\u00b0";
            }
          }
          ctx.fillText(label, x, y);
          ctx.restore();
        }
      }
      for (var bit = 0;bit < this.max_bits_to_draw;++bit) {
        if (instruction.targetQubits.getBit(bit)) {
          instruction.draw(ctx, 0, this.gridSize * bit, radius, bit, this, instruction_x, slot);
        } else {
          if (instruction.auxQubits && instruction.auxQubits.getBit(bit) && instruction.op == "dual_rail_beamsplitter") {
            var x = 0;
            var y = this.gridSize * bit;
            var xwidth = this.gridSize * .25;
            var high_targ = instruction.targetQubits.getHighestBitIndex();
            var dir_up = high_targ < bit ? 1 : -1;
            ctx.strokeStyle = "white";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x - xwidth, y);
            ctx.lineTo(x + xwidth, y);
            ctx.stroke();
            ctx.strokeStyle = "black";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x - xwidth, y);
            ctx.lineTo(x - .5 * xwidth, y + dir_up * .5 * xwidth);
            ctx.lineTo(x + .5 * xwidth, y + dir_up * .5 * xwidth);
            ctx.lineTo(x + xwidth, y);
            ctx.stroke();
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x - xwidth * 3, y + dir_up * 1.75 * xwidth);
            ctx.lineTo(x - xwidth, y + dir_up * 1.75 * xwidth);
            ctx.lineTo(x - .5 * xwidth, y + dir_up * 1.25 * xwidth);
            ctx.lineTo(x + .5 * xwidth, y + dir_up * 1.25 * xwidth);
            ctx.lineTo(x + xwidth, y + dir_up * 1.75 * xwidth);
            ctx.lineTo(x + xwidth * 3, y + dir_up * 1.75 * xwidth);
            ctx.stroke();
          } else {
            if (instruction.conditionQubits.getBit(bit)) {
              if (instruction.op == "phase" || instruction.op == "optical_phase") {
                ctx.lineWidth = 1;
                ctx.strokeStyle = "black";
                var cz_dots = false;
                if (instruction.theta == 0 || instruction.theta == 180) {
                  if (instruction.conditionQubits.countOneBits() > 1) {
                    cz_dots = true;
                  }
                }
                if (instruction.theta == 0) {
                  ctx.globalAlpha = .25;
                }
                if (cz_dots) {
                  ctx.fillStyle = "black";
                  fillCircle(ctx, 0, this.gridSize * bit, this.gridSize * .2);
                } else {
                  ctx.fillStyle = "white";
                  strokeCircle(ctx, 0, this.gridSize * bit, this.gridSize * .4);
                  fillCircle(ctx, 0, this.gridSize * bit, this.gridSize * .4);
                  strokeCircle(ctx, 0, this.gridSize * bit, this.gridSize * .15);
                  ctx.beginPath();
                  ctx.lineTo(this.gridSize * .03, this.gridSize * bit - this.gridSize * .3);
                  ctx.lineTo(-this.gridSize * .03, this.gridSize * bit + this.gridSize * .3);
                  ctx.stroke();
                }
                if (instruction.theta == 0) {
                  ctx.globalAlpha = 1;
                }
                if (instruction.noise_level > 0 && qc_options.draw_noise) {
                  var radius = this.gridSize * .4;
                  var level = instruction.noise_level / qc_options.noise_magnitude;
                  var radial_grad = ctx.createRadialGradient(0, this.gridSize * bit, 0, 0, this.gridSize * bit, radius * 2.25);
                  radial_grad.addColorStop(0, "rgba(255,100,0,255)");
                  radial_grad.addColorStop(1, "rgba(255,0,0,0");
                  ctx.globalAlpha = level;
                  ctx.fillStyle = radial_grad;
                  fillCircle(ctx, 0, this.gridSize * bit, radius * 2.25);
                  ctx.fillStyle = "#fff";
                  ctx.globalAlpha = 1;
                }
              } else {
                if (instruction.op == "pair_source") {
                  var high = instruction.conditionQubits.getHighestBitIndex();
                  var low = instruction.conditionQubits.getLowestBitIndex();
                  ctx.fillStyle = "#08f";
                  if (high == low) {
                    fillCircle(ctx, 0, this.gridSize * bit, this.gridSize * .3);
                  } else {
                    if (bit == low) {
                      fillCircle(ctx, 0, this.gridSize * bit, this.gridSize * .3, 0, 180);
                    } else {
                      if (bit == high) {
                        fillCircle(ctx, 0, this.gridSize * bit, this.gridSize * .3, 180, 0);
                      }
                    }
                  }
                } else {
                  ctx.fillStyle = "black";
                  fillCircle(ctx, 0, this.gridSize * bit, this.gridSize * .2);
                }
              }
            }
          }
        }
      }
      instruction.drawBlockJobs(ctx, 0, this.gridSize * this.qReg.numQubits, radius);
      ctx.restore();
    }
    ctx.restore();
  };
  this.drawInsertionPoint = function(ctx) {
    if (this.hoverInstruction < 0) {
      return;
    }
    ctx.save();
    ctx.strokeStyle = "orange";
    ctx.lineWidth = 1;
    ctx.beginPath();
    var x = this.gridSize * (this.insertionStart - .5);
    ctx.lineTo(x, -this.gridSize);
    ctx.lineTo(x, this.gridSize * this.qReg.numQubits);
    ctx.stroke();
    ctx.restore();
  };
  this.drawHoverPoint = function(ctx) {
    ctx.save();
    if (this.photonic_view) {
      ctx.strokeStyle = "black";
    } else {
      ctx.strokeStyle = "gray";
    }
    ctx.lineWidth = 1;
    ctx.beginPath();
    var x = this.gridSize * (this.hoverInstruction - .5);
    ctx.lineTo(x, -this.gridSize);
    ctx.lineTo(x, this.gridSize * this.qReg.numQubits);
    ctx.stroke();
    ctx.restore();
  };
  this.drawBackdrop = function(ctx) {
    ctx.fillRect(0, 0, this.qPanel.canvas.width, this.qPanel.canvas.height);
  };
  this.drawStaffLines = function(ctx) {
    this.makeWireGrid();
    var gx = this.gridSize * this.photonic_stretch;
    var gy = this.gridSize;
    ctx.save();
    var dark = "#000000";
    var light = "#dddddd";
    ctx.lineWidth = 1;
    for (var bit = 0;bit < this.max_bits_to_draw;++bit) {
      var startX = 0;
      var endX = 0;
      ctx.strokeStyle = light;
      var old_style = light;
      var new_style = light;
      var lastOp = null;
      var startx = 0;
      var x1 = (0 - 1) * gx;
      var x2 = (0 + 0) * gx;
      for (var col = 1;col < this.wire_grid.length;++col) {
        x1 = (col - 1) * gx;
        x2 = (col + 0) * gx;
        if (this.wire_grid[col].getBit(bit)) {
          new_style = dark;
        } else {
          new_style = light;
        }
        if (old_style != new_style || col == this.wire_grid.length - 1) {
          ctx.strokeStyle = old_style;
          ctx.beginPath();
          ctx.moveTo(startx, 0);
          if (col == this.wire_grid.length - 1) {
            ctx.lineTo(x2, 0);
          } else {
            ctx.lineTo(x1, 0);
          }
          ctx.stroke();
          startx = x1;
          old_style = new_style;
        }
      }
      ctx.translate(0, gy);
    }
    ctx.restore();
  };
  this.draw = function(hideInsertionPoint, instructionRange) {
    this.calculateScale();
    if (instructionRange) {
      var ir = instructionRange;
      if (ir[0] < 0) {
        ir[0] = ir[1];
      }
      if (ir[1] < 0) {
        ir[1] = ir[0];
      }
      if (ir[1] < ir[0]) {
        ir[1] = ir[0];
      }
      ir[0]--;
      ir[1]++;
    }
    var ctx = this.qPanel.canvas.getContext("2d");
    ctx.save();
    if (this.photonic_view && !this.classical_view) {
      ctx.fillStyle = "#999";
    } else {
      ctx.fillStyle = "#fff";
    }
    this.drawBackdrop(ctx);
    ctx.scale(this.scale, this.scale);
    ctx.translate(this.margin_x, this.margin_y);
    this.drawBits(ctx);
    ctx.translate(this.gridSize * 1.25 + this.nameWidth, 0);
    if (this.classical_view) {
      this.drawStaffLines(ctx);
      this.drawInstructions(ctx, instructionRange);
    }
    if (this.photonic_view) {
      ctx.save();
      ctx.translate(1, 1);
      ctx.strokeStyle = "black";
      ctx.lineWidth = 8;
      ctx.globalAlpha = .1;
      drawPhotonicInstructions(this, ctx);
      ctx.lineWidth = 6;
      ctx.globalAlpha = .2;
      drawPhotonicInstructions(this, ctx);
      ctx.lineWidth = 4;
      ctx.globalAlpha = .4;
      drawPhotonicInstructions(this, ctx);
      ctx.restore();
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.globalAlpha = 1;
      drawPhotonicInstructions(this, ctx);
    }
    if (this.hoverInstruction >= 0) {
      this.drawHoverPoint(ctx);
    }
    if (!hideInsertionPoint) {
      this.drawInsertionPoint(ctx);
    }
    this.drawCodeLabels(ctx);
    if (this.qReg.mbc) {
      this.qReg.mbc.draw_staff_overlay(ctx);
    }
    ctx.restore();
  };
  this.changed = function() {
  };
  this.message = function(msg, bitMask, arg1) {
  };
  this.getMouseInstructionSlot = function(x, y) {
    x /= this.scale;
    y /= this.scale;
    var xmin = this.margin_x + this.gridSize * 1.25 + this.nameWidth;
    var ymin = this.margin_y - .5 * this.gridSize;
    var ymax = this.margin_y + this.gridSize * this.qReg.numQubits;
    numSlots = this.instructions.length;
    if (this.instructions_parallel) {
      numSlots = this.instructions_parallel.length;
    }
    if (y >= ymin && y <= ymax) {
      var instructionNum = 1 + Math.floor((x - xmin) / this.gridSize);
      if (instructionNum >= 0 && instructionNum <= numSlots) {
        return instructionNum;
      }
    }
    return -1;
  };
  this.checkClickTravel = function(x, y) {
    if (this.inClick) {
      var dx = this.clickDownPosX - x;
      var dy = this.clickDownPosY - y;
      var cancel_dist = 10 * 10;
      if (dx * dx + dy * dy > cancel_dist * cancel_dist) {
        this.inClick = false;
      }
    }
  };
  this.mouseWheel = function(e) {
    if (e.ctrlKey == true) {
      var dy = e.deltaY;
      if (dy > 0) {
        this.wheelScale *= .9;
      }
      if (dy < 0) {
        this.wheelScale *= 1.1;
      }
      if (this.wheelScale < .1) {
        this.wheelScale = .1;
      }
      if (this.wheelScale > 3) {
        this.wheelScale = 3;
      }
      this.draw();
      return false;
    }
    return false;
  };
  this.mouseDown = function(x, y) {
    var grow_size = 20;
    if (x > this.qPanel.width - grow_size && y > this.qPanel.height - grow_size) {
      return false;
    }
    var inst = this.getMouseInstructionSlot(x, y);
    if (inst >= 0) {
      this.inClick = true;
      this.clickDownPosX = x;
      this.clickDownPosY = y;
      return true;
    }
    return false;
  };
  this.mouseUp = function(x, y) {
    this.checkClickTravel();
    if (this.inClick) {
      x = this.clickDownPosX;
      y = this.clickDownPosY;
      var inst = this.getMouseInstructionSlot(x, y);
      if (inst >= 0) {
        if (this.insertionStart != inst) {
          this.advance(inst - this.insertionStart);
          if (this.qReg.use_photon_sim) {
            this.qReg.photonSim.transferPhotonicToLogical();
          }
          if (this.qReg.chp && this.qReg.chp.active) {
            this.qReg.chp.transferCHPToLogical();
          }
          this.draw(false);
        }
      }
    }
    this.inClick = false;
  };
  this.mouseMove = function(x, y) {
    var grow_size = 20;
    if (x > this.qPanel.width - grow_size && y > this.qPanel.height - grow_size) {
      return false;
    }
    if (this.inClick) {
      this.checkClickTravel();
    } else {
      var oldHover = this.hoverInstruction;
      this.hoverInstruction = this.getMouseInstructionSlot(x, y);
      if (oldHover != this.hoverInstruction) {
        this.draw(false);
      }
    }
  };
  this.renderModel = function() {
    var frame = document.getElementById("render_frame");
    if (frame) {
      frame.contentWindow.update_model(this);
    }
  };
  this.makeWireGrid = function() {
    var num_columns = this.instructions.length + 1;
    if (this.instructions_parallel) {
      num_columns = this.instructions_parallel.length + 1;
    }
    var num_rows = this.qReg.numQubits;
    this.wire_grid = new Array(num_columns);
    for (var col = 0;col < num_columns;++col) {
      this.wire_grid[col] = new BitField(0, this.qReg.allBitsMask.numBits);
    }
    var brush = new BitField(0, this.qReg.allBitsMask.numBits);
    for (var inst_index = 0;inst_index < this.instructions.length;++inst_index) {
      var inst = this.instructions[inst_index];
      var col = inst.parallel_slot == null ? inst_index : inst.parallel_slot;
      this.wire_grid[col].set(brush);
      if (inst.op == "read" || inst.op == "postselect" || inst.op == "discard" || inst.op == "push_mixed") {
        inst.targetQubits.invert();
        brush.andEquals(inst.targetQubits);
        inst.targetQubits.invert();
      } else {
        if (inst.op == "exchange") {
          var high_pos = inst.targetQubits.getHighestBitIndex();
          var high_val = brush.getBit(high_pos);
          var low_pos = inst.targetQubits.getLowestBitIndex();
          var low_val = brush.getBit(low_pos);
          brush.setBit(high_pos, low_val);
          brush.setBit(low_pos, high_val);
        } else {
          if (inst.op == "polarization_grating_out") {
            var high_pos = inst.targetQubits.getHighestBitIndex();
            var low_pos = inst.targetQubits.getLowestBitIndex();
            if (inst.theta < 0) {
              brush.setBit(low_pos, 0);
            } else {
              brush.setBit(high_pos, 0);
            }
          } else {
            if (inst.op == "nop" || inst.op == "peek" || inst.op == "not" || inst.op == "cnot" || inst.op == "start_photon_sim" || inst.op == "stop_photon_sim" || inst.op == "start_chp_sim" || inst.op == "stop_chp_sim") {
            } else {
              if (inst.op == "pair_source") {
                brush.orEquals(inst.conditionQubits);
                brush.orEquals(inst.targetQubits);
              } else {
                brush.orEquals(inst.targetQubits);
              }
            }
          }
        }
      }
    }
    this.wire_grid[num_columns - 1].set(brush);
  };
  this.getFullWidth = function() {
    var gx = this.gridSize * this.photonic_stretch;
    var len = this.instructions.length;
    if (this.instructions_parallel) {
      len = this.instructions_parallel.length;
    }
    return this.wheelScale * (len * gx + 4 * this.margin_x + this.nameWidth);
  };
  this.getFullHeight = function() {
    return this.wheelScale * ((this.qReg.numQubits + 1) * this.gridSize + 1 * this.margin_y);
  };
  this.togglePhotonicView = function() {
    if (this.qReg.position_encoded) {
      this.photonic_view = !this.photonic_view;
    } else {
      this.photonic_view = false;
    }
    this.classical_view = !this.photonic_view;
  };
  this.togglePhotonicStretch = function() {
    var high = 6;
    var low = 1;
    var mid = .5 * (high + low);
    if (this.photonic_stretch > mid) {
      this.photonic_stretch = low;
    } else {
      this.photonic_stretch = high;
    }
  };
  this.fullSnapshot = function(max_width, max_height) {
    if (max_width == null) {
      max_width = 1024;
    }
    if (max_height == null) {
      max_height = 1024;
    }
    this.qPanel.setVisible(true);
    var wd = this.getFullWidth();
    var ht = this.getFullHeight();
    if (max_width && wd > max_width) {
      wd = max_width;
    }
    if (max_height && ht > max_height) {
      ht = max_height;
    }
    this.qPanel.setSize(wd, ht);
    this.draw(true);
  };
  this.cancelRedundantOperations = function() {
    var reparallelize = this.instructions_parallel != null;
    this.clearParallelization();
    var scratch_bf = new BitField(this.qReg.numQubits);
    for (var instIndex = 0;instIndex < this.instructions.length - 1;++instIndex) {
      var curr = this.instructions[instIndex];
      if (curr.op == "not" || curr.op == "cnot" || curr.op == "hadamard" || curr.op == "chadamard" || curr.op == "exchange" || curr.op == "cexchange" || curr.op == "dual_rail_beamsplitter" || curr.op == "pair_source") {
        var is_exchange = curr.op == "exchange" || curr.op == "cexchange" || curr.op == "dual_rail_beamsplitter" || curr.op == "pair_source";
        for (var instIndex2 = instIndex + 1;instIndex2 < this.instructions.length;++instIndex2) {
          var blocked = false;
          var next = this.instructions[instIndex2];
          if (curr.op == next.op) {
            if (bitFieldsAreIdentical(curr.conditionQubits, next.conditionQubits)) {
              if (bitFieldsAreIdentical(curr.targetQubits, next.targetQubits)) {
                this.removeInstruction(instIndex2);
                this.removeInstruction(instIndex);
                instIndex--;
                blocked = true;
              } else {
                if (is_exchange) {
                  scratch_bf.set(curr.targetQubits);
                  scratch_bf.andEquals(next.targetQubits);
                  if (!isAllZero(scratch_bf)) {
                    blocked = true;
                  }
                } else {
                  curr.targetQubits.xorEquals(next.targetQubits);
                  this.removeInstruction(instIndex2);
                }
              }
            } else {
              scratch_bf.set(curr.targetQubits);
              scratch_bf.andEquals(next.targetQubits);
              if (!isAllZero(scratch_bf)) {
                blocked = true;
              }
              scratch_bf.set(curr.targetQubits);
              scratch_bf.andEquals(next.conditionQubits);
              if (!isAllZero(scratch_bf)) {
                blocked = true;
              }
              scratch_bf.set(curr.conditionQubits);
              scratch_bf.andEquals(next.targetQubits);
              if (!isAllZero(scratch_bf)) {
                blocked = true;
              }
            }
          } else {
            blocked = true;
          }
          if (blocked) {
            break;
          }
        }
      }
    }
    if (reparallelize) {
      this.parallelize(this.parallelize_option);
    }
  };
  this.clearParallelization = function() {
    this.insertionStart = 0;
    this.instructions_parallel = null;
    for (var instIndex = 0;instIndex < this.instructions.length;++instIndex) {
      var inst = this.instructions[instIndex];
      inst.parallel_slot = null;
      inst.parallel_index_in_slot = null;
      inst.parallel_offset = null;
    }
  };
  this.parallelize = function(crossLabelBounds) {
    this.insertionStart = 0;
    this.parallelize_option = crossLabelBounds;
    this.cancelRedundantOperations();
    this.instructions_parallel = new Array;
    var bfi = new BitField(0, this.qReg.numQubits);
    var bfp = new BitField(0, this.qReg.numQubits);
    var bfprev = new BitField(0, this.qReg.numQubits);
    for (var instIndex = 0;instIndex < this.instructions.length;++instIndex) {
      var foundSlot = 0;
      var inst = this.instructions[instIndex];
      bfi.set(inst.targetQubits);
      bfi.orEquals(inst.conditionQubits);
      bfi.orEquals(inst.auxQubits);
      bfp.set(0);
      var min_bit = bfi.getLowestBitIndex();
      var max_bit = bfi.getHighestBitIndex();
      for (var parIndex = this.instructions_parallel.length - 1;parIndex >= 0 && foundSlot == 0;--parIndex) {
        var parallelSlot = this.instructions_parallel[parIndex];
        var match_codelabel = true;
        for (var i = 0;i < parallelSlot.length;++i) {
          bfp.orEquals(parallelSlot[i].targetQubits);
          bfp.orEquals(parallelSlot[i].conditionQubits);
          bfp.orEquals(parallelSlot[i].auxQubits);
          if (inst.codeLabel != parallelSlot[i].codeLabel) {
            match_codelabel = false;
          }
        }
        bfp.andEquals(bfi);
        var blocked = !isAllZero(bfp);
        if (!match_codelabel && !crossLabelBounds) {
          blocked = true;
        }
        if (blocked) {
          foundSlot = parIndex + 1;
        }
      }
      if (foundSlot >= this.instructions_parallel.length) {
        this.instructions_parallel.push(new Array);
      }
      inst.parallel_slot = foundSlot;
      inst.parallel_index_in_slot = this.instructions_parallel[foundSlot].length;
      inst.parallel_offset = inst.parallel_index_in_slot;
      if (inst.parallel_index_in_slot > 0) {
        var prev_inst = this.instructions_parallel[foundSlot][inst.parallel_index_in_slot - 1];
        bfprev.set(prev_inst.targetQubits);
        bfprev.orEquals(prev_inst.conditionQubits);
        bfprev.orEquals(prev_inst.auxQubits);
        var prev_min_bit = bfprev.getLowestBitIndex();
        var prev_max_bit = bfprev.getHighestBitIndex();
        if (min_bit == -1 || prev_min_bit == -1 || max_bit < prev_min_bit || min_bit > prev_max_bit) {
          inst.parallel_offset = prev_inst.parallel_offset;
        } else {
          inst.parallel_offset = 1 + prev_inst.parallel_offset;
        }
      }
      this.instructions_parallel[foundSlot].push(inst);
    }
    console.log("parallelize: " + this.instructions.length + " -> " + this.instructions_parallel.length);
  };
  this.convertExchangeToCnot = function(only_conditional_exchanges) {
    var targ1_bf = new BitField(0, this.qReg.numQubits);
    var targ2_bf = new BitField(0, this.qReg.numQubits);
    var cond2_bf = new BitField(0, this.qReg.numQubits);
    for (var instIndex = 0;instIndex < this.instructions.length;++instIndex) {
      var curr = this.instructions[instIndex];
      var do_this_one = curr.op == "exchange";
      if (do_this_one && only_conditional_exchanges && isAllZero(curr.conditionQubits)) {
        do_this_one = false;
      }
      if (do_this_one) {
        var hi_targ = curr.targetQubits.getHighestBitIndex();
        var lo_targ = curr.targetQubits.getLowestBitIndex();
        targ1_bf.set(0);
        targ2_bf.set(0);
        cond2_bf.set(curr.conditionQubits);
        targ1_bf.setBit(hi_targ, 1);
        targ2_bf.setBit(lo_targ, 1);
        cond2_bf.setBit(hi_targ, 1);
        var new_inst1 = new QInstruction("cnot", targ1_bf, targ2_bf, 0, curr.codeLabel);
        var new_inst2 = new QInstruction("cnot", targ2_bf, cond2_bf, 0, curr.codeLabel);
        var new_inst3 = new QInstruction("cnot", targ1_bf, targ2_bf, 0, curr.codeLabel);
        this.removeInstruction(instIndex);
        this.insertInstruction(instIndex, new_inst1);
        this.insertInstruction(instIndex, new_inst2);
        this.insertInstruction(instIndex, new_inst3);
      }
    }
    this.cancelRedundantOperations();
  };
  this.convertToBeamSplitters = function() {
    var only_conditional_exchanges = true;
    this.clearParallelization();
    var targ1_bf = new BitField(0, this.qReg.numQubits);
    var targ2_bf = new BitField(0, this.qReg.numQubits);
    var cond2_bf = new BitField(0, this.qReg.numQubits);
    var split2_bf = new BitField(0, this.qReg.numQubits);
    var split3_bf = new BitField(0, this.qReg.numQubits);
    for (var instIndex = 0;instIndex < this.instructions.length;++instIndex) {
      var curr = this.instructions[instIndex];
      var do_this_one = curr.op == "exchange" || curr.op == "rootexchange" || curr.op == "rootexchange_inv";
      if (do_this_one && only_conditional_exchanges && isAllZero(curr.conditionQubits)) {
        do_this_one = false;
      }
      if (do_this_one) {
        var cond = curr.conditionQubits.getHighestBitIndex();
        var hi_targ = curr.targetQubits.getHighestBitIndex();
        var lo_targ = curr.targetQubits.getLowestBitIndex();
        targ1_bf.set(0);
        targ2_bf.set(0);
        cond2_bf.set(curr.conditionQubits);
        targ1_bf.setBit(hi_targ, 1);
        targ2_bf.setBit(lo_targ, 1);
        cond2_bf.setBit(hi_targ, 1);
        var reflectivity = .5;
        this.removeInstruction(instIndex);
        this.insertInstruction(instIndex, new QInstruction("beamsplitter", curr.targetQubits, null, reflectivity, curr.codeLabel));
        var utility_bit;
        utility_bit = this.qReg.findClosestUtilityBit(cond + 1);
        split2_bf.set(0);
        split2_bf.setBit(cond + 1, 1);
        if (utility_bit >= 0) {
          split2_bf.setBit(utility_bit, 1);
        }
        this.insertInstruction(instIndex, new QInstruction("beamsplitter", split2_bf, null, reflectivity, curr.codeLabel));
        split2_bf.set(0);
        split2_bf.setBit(cond, 1);
        split2_bf.setBit(hi_targ, 1);
        this.insertInstruction(instIndex, new QInstruction("beamsplitter", split2_bf, null, reflectivity, curr.codeLabel));
        utility_bit = this.qReg.findClosestUtilityBit(lo_targ);
        split2_bf.set(0);
        split2_bf.setBit(lo_targ, 1);
        if (utility_bit >= 0) {
          split2_bf.setBit(utility_bit, 1);
        }
        this.insertInstruction(instIndex, new QInstruction("beamsplitter", split2_bf, null, reflectivity, curr.codeLabel));
        this.insertInstruction(instIndex, new QInstruction("beamsplitter", curr.targetQubits, null, reflectivity, curr.codeLabel));
      }
    }
    this.cancelRedundantOperations();
  };
  this.convertGatesToOneTargetQubit = function() {
    var did_something = true;
    while (did_something) {
      did_something = false;
      for (var instIndex = 0;instIndex < this.instructions.length;++instIndex) {
        var curr = this.instructions[instIndex];
        if (curr.op == "cnot" || curr.op == "not") {
          if (curr.targetQubits.countOneBits() > 1) {
            did_something = true;
            this.removeInstruction(instIndex);
            var low = curr.targetQubits.getLowestBitIndex();
            var high = curr.targetQubits.getHighestBitIndex();
            for (var bit = low;bit <= high;++bit) {
              if (curr.targetQubits.getBit(bit)) {
                var new_targ = new BitField(curr.targetQubits);
                new_targ.set(0);
                new_targ.setBit(bit, 1);
                var new_inst = new QInstruction(curr.op, new_targ, curr.conditionQubits, 0, curr.codeLabel);
                this.insertInstruction(instIndex, new_inst);
              }
            }
          }
        }
      }
    }
    this.cancelRedundantOperations();
  };
  this.convertGatesTo1Condition = function() {
    this.convertGatesToOneTargetQubit();
    var did_something = true;
    while (did_something) {
      did_something = false;
      for (var instIndex = 0;instIndex < this.instructions.length;++instIndex) {
        var curr = this.instructions[instIndex];
        if (curr.op == "cnot" || curr.op == "not" || curr.op == "exchange" || curr.op == "cexchange") {
          if (curr.conditionQubits.countOneBits() > 1) {
            did_something = true;
            this.removeInstruction(instIndex);
            var low = curr.conditionQubits.getLowestBitIndex();
            var high = curr.conditionQubits.getHighestBitIndex();
            var cond_minus_one = new BitField(curr.conditionQubits);
            var cond_one = new BitField(curr.conditionQubits);
            var targ = curr.targetQubits;
            cond_one.set(0);
            cond_one.setBit(high, 1);
            cond_minus_one.setBit(high, 0);
            v_op = "crootnot";
            vt_op = "crootnot_inv";
            if (curr.op == "exchange" || curr.op == "cexchange") {
              v_op = "rootexchange";
              vt_op = "rootexchange_inv";
            }
            this.insertInstruction(instIndex, new QInstruction(v_op, curr.targetQubits, cond_minus_one, 0, curr.codeLabel));
            this.insertInstruction(instIndex, new QInstruction("cnot", cond_one, cond_minus_one, 0, curr.codeLabel));
            this.insertInstruction(instIndex, new QInstruction(vt_op, curr.targetQubits, cond_one, 0, curr.codeLabel));
            this.insertInstruction(instIndex, new QInstruction("cnot", cond_one, cond_minus_one, 0, curr.codeLabel));
            this.insertInstruction(instIndex, new QInstruction(v_op, targ, cond_one, 0, curr.codeLabel));
            did_something = true;
          }
        }
      }
    }
    this.cancelRedundantOperations();
  };
  this.convertGatesTo2Condition = function() {
    this.convertGatesToOneTargetQubit();
    var bfi = new BitField(0, this.qReg.numQubits);
    var bfs = new BitField(0, this.qReg.numQubits);
    var bf_primary = new BitField(0, this.qReg.numQubits);
    var bf_secondary = new BitField(0, this.qReg.numQubits);
    var did_something = true;
    while (did_something) {
      did_something = false;
      for (var instIndex = 0;instIndex < this.instructions.length;++instIndex) {
        var curr = this.instructions[instIndex];
        if (curr.op == "cnot" || curr.op == "not" || curr.op == "exchange") {
          var num_condition_bits = curr.conditionQubits.countOneBits();
          var targ = curr.targetQubits;
          if (num_condition_bits > 2) {
            bfi.set(curr.targetQubits);
            bfi.orEquals(curr.conditionQubits);
            var bfi_low = bfi.getLowestBitIndex();
            var bfi_high = bfi.getHighestBitIndex();
            var scratch_bit = bfi_low - 1;
            if (bfi_low == 0) {
              scratch_bit = 1;
              while (bfi.getBit(scratch_bit)) {
                scratch_bit++;
              }
            }
            if (scratch_bit < this.qReg.numQubits) {
              did_something = true;
              bfs.set(0);
              bfs.setBit(scratch_bit, 1);
              var num_primary_conditions = num_condition_bits >>> 1;
              bf_primary.set(0);
              bf_primary.setBit(scratch_bit, 1);
              bf_secondary.set(0);
              var primary_count = 0;
              for (var bit = bfi_low;bit <= bfi_high;++bit) {
                if (curr.conditionQubits.getBit(bit)) {
                  if (primary_count < num_primary_conditions) {
                    bf_primary.setBit(bit, 1);
                    primary_count++;
                  } else {
                    bf_secondary.setBit(bit, 1);
                  }
                }
              }
              this.removeInstruction(instIndex);
              this.insertInstruction(instIndex, new QInstruction("cnot", bfs, bf_secondary, 0, curr.codeLabel));
              this.insertInstruction(instIndex, new QInstruction(curr.op, targ, bf_primary, 0, curr.codeLabel));
              this.insertInstruction(instIndex, new QInstruction("cnot", bfs, bf_secondary, 0, curr.codeLabel));
              this.insertInstruction(instIndex, new QInstruction(curr.op, targ, bf_primary, 0, curr.codeLabel));
            }
          }
        }
      }
    }
    this.cancelRedundantOperations();
  };
  this.migrateAdjacent1D = function(collectTargets, dontUnTwistAtEnd) {
    var allInstBits = new BitField(0, this.qReg.numQubits);
    var exchangeBits = new BitField(0, this.qReg.numQubits);
    var swapper = new BitSwapper(this.qReg.numQubits);
    for (var instIndex = 0;instIndex < this.instructions.length;++instIndex) {
      var curr = this.instructions[instIndex];
      swapper.convertInstruction(curr);
      if (curr.op == "exchange" || curr.op == "dual_rail_beamsplitter" || curr.op == "pair_source" || curr.op == "rootexchange" || curr.op == "rootexchange_inv" || !isAllZero(curr.conditionQubits)) {
        allInstBits.set(curr.targetQubits);
        allInstBits.orEquals(curr.conditionQubits);
        var count = allInstBits.countOneBits();
        if (count > 1) {
          var low = allInstBits.getLowestBitIndex();
          var high = allInstBits.getHighestBitIndex();
          while (high - low > count - 1) {
            var center = 0;
            var inv_count = 0;
            for (var i = low;i <= high;++i) {
              if (!allInstBits.getBit(i)) {
                center += i;
                inv_count++;
              }
            }
            center = 0 | center / inv_count;
            for (bit = center;bit < high;++bit) {
              if (!allInstBits.getBit(bit) && allInstBits.getBit(bit + 1)) {
                exchangeBits.set(0);
                exchangeBits.setBit(bit, 1);
                exchangeBits.setBit(bit + 1, 1);
                this.insertInstruction(instIndex, new QInstruction("exchange", exchangeBits, 0, 0, curr.codeLabel));
                swapper.swap(bit, bit + 1, curr);
                instIndex++;
                allInstBits.set(curr.targetQubits);
                allInstBits.orEquals(curr.conditionQubits);
                low = allInstBits.getLowestBitIndex();
                high = allInstBits.getHighestBitIndex();
              }
            }
            for (bit = center;bit > low;--bit) {
              if (!allInstBits.getBit(bit) && allInstBits.getBit(bit - 1)) {
                exchangeBits.set(0);
                exchangeBits.setBit(bit, 1);
                exchangeBits.setBit(bit - 1, 1);
                this.insertInstruction(instIndex, new QInstruction("exchange", exchangeBits, 0, 0, curr.codeLabel));
                swapper.swap(bit, bit - 1, curr);
                instIndex++;
                allInstBits.set(curr.targetQubits);
                allInstBits.orEquals(curr.conditionQubits);
                low = allInstBits.getLowestBitIndex();
                high = allInstBits.getHighestBitIndex();
              }
            }
          }
          if (collectTargets) {
            allInstBits.set(curr.targetQubits);
            count = allInstBits.countOneBits();
            var low = allInstBits.getLowestBitIndex();
            var high = allInstBits.getHighestBitIndex();
            while (high - low > count - 1) {
              var center = 0;
              var inv_count = 0;
              for (var i = low;i <= high;++i) {
                if (!allInstBits.getBit(i)) {
                  center += i;
                  inv_count++;
                }
              }
              center = 0 | center / inv_count;
              for (bit = center;bit < high;++bit) {
                if (!allInstBits.getBit(bit) && allInstBits.getBit(bit + 1)) {
                  exchangeBits.set(0);
                  exchangeBits.setBit(bit, 1);
                  exchangeBits.setBit(bit + 1, 1);
                  this.insertInstruction(instIndex, new QInstruction("exchange", exchangeBits, 0, 0, curr.codeLabel));
                  swapper.swap(bit, bit + 1, curr);
                  instIndex++;
                  allInstBits.set(curr.targetQubits);
                  low = allInstBits.getLowestBitIndex();
                  high = allInstBits.getHighestBitIndex();
                }
              }
              for (bit = center;bit > low;--bit) {
                if (!allInstBits.getBit(bit) && allInstBits.getBit(bit - 1)) {
                  exchangeBits.set(0);
                  exchangeBits.setBit(bit, 1);
                  exchangeBits.setBit(bit - 1, 1);
                  this.insertInstruction(instIndex, new QInstruction("exchange", exchangeBits, 0, 0, curr.codeLabel));
                  swapper.swap(bit, bit - 1, curr);
                  instIndex++;
                  allInstBits.set(curr.targetQubits);
                  low = allInstBits.getLowestBitIndex();
                  high = allInstBits.getHighestBitIndex();
                }
              }
            }
          }
        }
      }
    }
    if (!dontUnTwistAtEnd) {
      for (var sb = 0;sb < swapper.numBits;++sb) {
        if (swapper.table[sb] != sb) {
          var sb2 = sb + 1;
          while (swapper.table[sb2] != sb) {
            sb2++;
          }
          while (sb2 > sb) {
            exchangeBits.set(0);
            exchangeBits.setBit(sb2, 1);
            exchangeBits.setBit(sb2 - 1, 1);
            this.insertInstruction(instIndex, new QInstruction("exchange", exchangeBits, 0, 0, "swap restore"));
            swapper.swap(sb2, sb2 - 1);
            instIndex++;
            sb2--;
          }
        }
      }
    }
    this.cancelRedundantOperations();
  };
  this.migrateAdjacent1D_V2 = function() {
    var exchangeBits = new BitField(0, this.qReg.numQubits);
    var used_bits = new BitField(0, this.qReg.numQubits);
    var swapper = new BitSwapper(this.qReg.numQubits);
    for (var instIndex = 0;instIndex < this.instructions.length;++instIndex) {
      var curr = this.instructions[instIndex];
      swapper.convertInstruction(curr);
      if (curr.op == "exchange" || curr.op == "rootexchange" || curr.op == "rootexchange_inv" || !isAllZero(curr.conditionQubits)) {
        var cond_count = curr.conditionQubits.countOneBits();
        var targ_count = curr.targetQubits.countOneBits();
        if (cond_count <= 1 && targ_count == 2) {
          var cond = curr.conditionQubits.getLowestBitIndex();
          var targ_high = curr.targetQubits.getHighestBitIndex();
          var targ_low = curr.targetQubits.getLowestBitIndex();
          if (targ_high == targ_low + 1 && (cond == -1 || cond == targ_low - 1 || cond == targ_high + 1)) {
          } else {
            var best_cost = 1E6;
            var best_th = -1;
            var best_tl = -1;
            var best_c = -1;
            for (var tb = 0;tb < this.qReg.numQubits - 1;++tb) {
              var whatif_targ_low = tb;
              var whatif_targ_high = tb + 1;
              var whatif_cond = -1;
              var cost = 0;
              if (used_bits.getBit(swapper.table[whatif_targ_high]) || used_bits.getBit(swapper.table[targ_high])) {
                cost += Math.abs(whatif_targ_high - targ_high);
              }
              if (used_bits.getBit(swapper.table[whatif_targ_low]) || used_bits.getBit(swapper.table[targ_low])) {
                cost += Math.abs(whatif_targ_low - targ_low);
              }
              if (cond_count) {
                var c1 = tb - 1;
                var c2 = tb + 2;
                var cost1 = 1E6;
                var cost2 = 1E6;
                if (c1 >= 0) {
                  cost1 = Math.abs(c1 - cond);
                  if (!used_bits.getBit(swapper.table[c1]) && !used_bits.getBit(swapper.table[cond])) {
                    cost1 = 0;
                  }
                }
                if (c2 < qReg.numQubits) {
                  cost2 = Math.abs(c2 - cond);
                  if (!used_bits.getBit(swapper.table[c2]) && !used_bits.getBit(swapper.table[cond])) {
                    cost2 = 0;
                  }
                }
                if (cost1 < cost2) {
                  whatif_cond = c1;
                  cost += cost1;
                } else {
                  whatif_cond = c2;
                  cost += cost1;
                }
              }
              if (cost < best_cost) {
                best_cost = cost;
                best_th = whatif_targ_high;
                best_tl = whatif_targ_low;
                best_c = whatif_cond;
              }
            }
            var move_done = false;
            while (!move_done) {
              cond = curr.conditionQubits.getLowestBitIndex();
              targ_high = curr.targetQubits.getHighestBitIndex();
              targ_low = curr.targetQubits.getLowestBitIndex();
              if (targ_high != best_th) {
                var bit = targ_high;
                var dest = best_th;
                var dir = dest > bit ? 1 : -1;
                if (!used_bits.getBit(swapper.table[bit]) && !used_bits.getBit(swapper.table[dest])) {
                  used_bits.setBit(swapper.table[bit], 1);
                  used_bits.setBit(swapper.table[dest], 1);
                  swapper.swap(bit, dest, curr);
                  bit = dest;
                }
                while (bit != dest) {
                  exchangeBits.set(0);
                  exchangeBits.setBit(bit, 1);
                  exchangeBits.setBit(bit + dir, 1);
                  this.insertInstruction(instIndex, new QInstruction("exchange", exchangeBits, 0, 0, curr.codeLabel));
                  swapper.swap(bit, bit + dir, curr);
                  instIndex++;
                  bit += dir;
                }
                cond = curr.conditionQubits.getLowestBitIndex();
                targ_high = curr.targetQubits.getHighestBitIndex();
                targ_low = curr.targetQubits.getLowestBitIndex();
                continue;
              }
              if (targ_low != best_tl) {
                var bit = targ_low;
                var dest = best_tl;
                var dir = dest > bit ? 1 : -1;
                if (!used_bits.getBit(swapper.table[bit]) && !used_bits.getBit(swapper.table[dest])) {
                  used_bits.setBit(swapper.table[bit], 1);
                  used_bits.setBit(swapper.table[dest], 1);
                  swapper.swap(bit, dest, curr);
                  bit = dest;
                }
                while (bit != dest) {
                  exchangeBits.set(0);
                  exchangeBits.setBit(bit, 1);
                  exchangeBits.setBit(bit + dir, 1);
                  this.insertInstruction(instIndex, new QInstruction("exchange", exchangeBits, 0, 0, curr.codeLabel));
                  swapper.swap(bit, bit + dir, curr);
                  instIndex++;
                  bit += dir;
                }
                cond = curr.conditionQubits.getLowestBitIndex();
                targ_high = curr.targetQubits.getHighestBitIndex();
                targ_low = curr.targetQubits.getLowestBitIndex();
                continue;
              }
              if (cond_count && cond != best_c) {
                var bit = cond;
                var dest = best_c;
                var dir = dest > bit ? 1 : -1;
                if (!used_bits.getBit(swapper.table[bit]) && !used_bits.getBit(swapper.table[dest])) {
                  used_bits.setBit(swapper.table[bit], 1);
                  used_bits.setBit(swapper.table[dest], 1);
                  swapper.swap(bit, dest, curr);
                  bit = dest;
                }
                while (bit != dest) {
                  exchangeBits.set(0);
                  exchangeBits.setBit(bit, 1);
                  exchangeBits.setBit(bit + dir, 1);
                  this.insertInstruction(instIndex, new QInstruction("exchange", exchangeBits, 0, 0, curr.codeLabel));
                  swapper.swap(bit, bit + dir, curr);
                  instIndex++;
                  bit += dir;
                }
                cond = curr.conditionQubits.getLowestBitIndex();
                targ_high = curr.targetQubits.getHighestBitIndex();
                targ_low = curr.targetQubits.getLowestBitIndex();
                continue;
              }
              if (targ_high == best_th && targ_low == best_tl && (cond_count == 0 || cond == best_c)) {
                move_done = true;
              }
            }
          }
        }
      }
      if (curr.op != "write" && curr.op != "postselect" && curr.op != "discard") {
        var allInstBits = new BitField(0, this.qReg.numQubits);
        allInstBits.set(curr.targetQubits);
        allInstBits.orEquals(curr.conditionQubits);
        allInstBits.orEquals(curr.auxQubits);
        for (var bit = 0;bit < qReg.numQubits;++bit) {
          if (allInstBits.getBit(bit)) {
            used_bits.setBit(swapper.table[bit], 1);
          }
        }
      }
    }
    if (0) {
      for (var sb = 0;sb < swapper.numBits;++sb) {
        if (swapper.table[sb] != sb) {
          var sb2 = sb + 1;
          while (swapper.table[sb2] != sb) {
            sb2++;
          }
          while (sb2 > sb) {
            exchangeBits.set(0);
            exchangeBits.setBit(sb2, 1);
            exchangeBits.setBit(sb2 - 1, 1);
            this.insertInstruction(instIndex, new QInstruction("exchange", exchangeBits, 0, 0, "swap restore"));
            swapper.swap(sb2, sb2 - 1);
            instIndex++;
            sb2--;
          }
        }
      }
    }
    this.cancelRedundantOperations();
  };
}
;var XMLHttpFactories = [function() {
  return new XMLHttpRequest;
}, function() {
  return new ActiveXObject("Msxml2.XMLHTTP");
}, function() {
  return new ActiveXObject("Msxml3.XMLHTTP");
}, function() {
  return new ActiveXObject("Microsoft.XMLHTTP");
}];
function sendRequest(url, callback, postData) {
  var req = createXMLHTTPObject();
  if (!req) {
    return;
  }
  var method = postData ? "POST" : "GET";
  req.open(method, url, true);
  if (postData) {
    req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  }
  req.onreadystatechange = function() {
    if (req.readyState != 4) {
      return;
    }
    if (req.status != 200 && req.status != 304) {
      return;
    }
    if (callback != null) {
      callback(req);
    }
  };
  if (req.readyState == 4) {
    return;
  }
  req.send(postData);
}
function createXMLHTTPObject() {
  var xmlhttp = false;
  for (var i = 0;i < XMLHttpFactories.length;i++) {
    try {
      xmlhttp = XMLHttpFactories[i]();
    } catch (e$3) {
      continue;
    }
    break;
  }
  return xmlhttp;
}
function debug(str) {
}
function ShowDiv(name, visible) {
  var theDiv = document.getElementById(name);
  if (visible) {
    theDiv.style.display = "block";
  } else {
    theDiv.style.display = "none";
  }
}
function IsDivVisible(name) {
  var theDiv = document.getElementById(name);
  return theDiv.style.display != "none";
}
function ToggleDiv(name) {
  ShowDiv(name, !IsDivVisible(name));
}
function ShowSampleDiv(visible) {
  var name = "sampleDiv";
  if (visible) {
    ShowDiv("uploadFrameDiv", false);
    ShowDiv("imageDiv", false);
    ShowDiv(name, true);
  } else {
    SelectSample(null);
    ShowDiv(name, false);
    ShowDiv("uploadFrameDiv", true);
    ShowDiv("imageDiv", true);
  }
}
function ToggleSampleDiv() {
  var name = "sampleDiv";
  ShowSampleDiv(!IsDivVisible(name));
}
function HandleGuestNumberResponse(req) {
  var guestNumber = parseInt(req.responseText);
  SetUserName("guest_" + guestNumber);
}
function SetUserName(name) {
  gUserName = name;
  gNeedModelRefresh = true;
  gNeedImageRefresh = true;
  SaveUserName();
  var happyName = gUserName;
  if (gUserName.indexOf("guest_") == 0) {
    happyName = "Special Guest #" + gUserName.slice(6);
    ShowDiv("signOutDiv", false);
    ShowDiv("suggestLogin", true);
  } else {
    ShowDiv("suggestLogin", false);
    ShowDiv("signOutDiv", true);
  }
  gUserNameInput.value = happyName;
}
function SignOut() {
  ClearModelFrames();
  ShowDiv("registerBox", false);
  ShowDiv("signInBox", false);
  SetUserName("");
  LoadUserName();
}
function LoadUserName() {
  var userName = readCookie("machineLevel_user");
  if (userName == "" || userName == null) {
    userName = "guest";
  } else {
    SetUserName(userName);
  }
}
function SaveUserName() {
  createCookie("machineLevel_user", gUserName, 500);
}
function createCookie(name, value, days) {
  if (days) {
    var date = new Date;
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1E3);
    var expires = "; expires=" + date.toGMTString();
  } else {
    var expires = ""
  }
  document.cookie = name + "=" + value + expires + "; path=/";
}
function readCookie(name) {
  var nameEQ = name + "=";
  var ca = document.cookie.split(";");
  for (var i = 0;i < ca.length;i++) {
    var c = ca[i];
    while (c.charAt(0) == " ") {
      c = c.substring(1, c.length);
    }
    if (c.indexOf(nameEQ) == 0) {
      return c.substring(nameEQ.length, c.length);
    }
  }
  return null;
}
function eraseCookie(name) {
  createCookie(name, "", -1);
}
;var qcEngineSetupPanel = null;
function createSetupPanel(qReg, x, y) {
  qcEngineSetupPanel = this;
  this.qReg = qReg;
  this.div = createDiv(x, y);
  div.style.cssText += "background-color: #fff;";
  var button = document.createElement("button");
  var singlePrecisionChecked = "";
  var doublePrecisionChecked = "";
  if (qReg.doublePrecision) {
    doublePrecisionChecked = 'checked="checked"';
  } else {
    singlePrecisionChecked = 'checked="checked"';
  }
  var divHTML = "";
  divHTML += '<font face="Tahoma, Digital, Arial, Helvetica, sans-serif" size="2">';
  divHTML += "<table>";
  divHTML += "  <tr>";
  divHTML += '    <td><font size="4"><b>QC Engine Setup</b></font></td>';
  divHTML += "  </tr><tr>";
  divHTML += "    <td>";
  divHTML += "      <table>";
  divHTML += "        <tr>";
  divHTML += "          <td>";
  divHTML += "            Total Qubits ";
  divHTML += '            <input type="text" id="numQubitsSet" size="4" value="' + qReg.numQubits + '"/>';
  divHTML += '            <input type="button" onclick="qcEngineSetupPanel.incQubits(1, 1);" value="+" />';
  divHTML += '            <input type="button" onclick="qcEngineSetupPanel.incQubits(-1, -1);" value="-" />';
  divHTML += "          </td>";
  divHTML += "        </tr><tr>";
  divHTML += "          <td>";
  divHTML += "            Block Count ";
  divHTML += '            <input type="text" id="numBlockQubitsSet" size="4" value="' + qReg.numBlockQubits + '"/>';
  divHTML += '            <input type="button" onclick="qcEngineSetupPanel.incQubits(0, 1);" value="+" />';
  divHTML += '            <input type="button" onclick="qcEngineSetupPanel.incQubits(0, -1);" value="-" />';
  divHTML += "          </td>";
  divHTML += "        </tr><tr>";
  divHTML += '          <td><input type="radio" id="singlePrecisionRadio" name="group1" onclick="qcEngineSetupPanel.checkQCSettings();" value="Single" ' + singlePrecisionChecked + ">Single precision</input></td>";
  divHTML += "        </tr><tr>";
  divHTML += '          <td><input type="radio" id="doublePrecisionRadio" name="group1" onclick="qcEngineSetupPanel.checkQCSettings();" value="Double" ' + doublePrecisionChecked + ">Double precision</input></td>";
  divHTML += "        </tr><tr>";
  divHTML += '          <td><input type="button" onclick="startQCSim();" value="Start QC Simulation" style="background-color:#8f8; color:#000;"/></td>';
  divHTML += "        </tr><tr>";
  divHTML += "        </tr><tr>";
  divHTML += '          <td><input type="button" onclick="stopQCSim();" value="Stop QC Simulation" style="background-color:#f88; color:#000;"/></td>';
  divHTML += "        </tr><tr>";
  divHTML += "        </tr>";
  divHTML += "      </table>";
  divHTML += "    </td>";
  divHTML += '    <td valign="top">';
  divHTML += '      <span id="setupNotesSpan"></span>';
  divHTML += "    </td>";
  divHTML += "  </tr>";
  divHTML += "</table>";
  divHTML += "</font>";
  this.div.innerHTML = divHTML;
  this.notesSpan = document.getElementById("setupNotesSpan");
  this.numQubitsInput = document.getElementById("numQubitsSet");
  this.numBlockQubitsInput = document.getElementById("numBlockQubitsSet");
  this.singlePrecisionRadio = document.getElementById("singlePrecisionRadio");
  this.doublePrecisionRadio = document.getElementById("doublePrecisionRadio");
  this.panel = new Panel(null, this.div);
  this.printNotes = function(str) {
    this.notesSpan.innerHTML = str;
  };
  this.incQubits = function(total, block) {
    var nq = parseFloat(this.numQubitsInput.value);
    nq += total;
    if (nq < 1) {
      nq = 1;
    }
    this.numQubitsInput.value = nq;
    var nbq = parseFloat(this.numBlockQubitsInput.value);
    nbq += block;
    if (nbq < 1) {
      nbq = 1;
    }
    if (nbq > nq) {
      nbq = nq;
    }
    this.numBlockQubitsInput.value = nbq;
    this.checkQCSettings();
  };
  this.printCountFromLog2 = function(sizeLog2) {
  };
  this.printDataSizeFromLog2 = function(sizeLog2) {
    var str = "";
    var sizeTop = sizeLog2;
    while (sizeTop >= 10) {
      sizeTop -= 10;
    }
    sizeTop = 1 << sizeTop;
    if (sizeLog2 < 10) {
      str += sizeTop + " bytes";
    } else {
      if (sizeLog2 < 20) {
        str += sizeTop + " KB";
      } else {
        if (sizeLog2 < 30) {
          str += sizeTop + " MB";
        } else {
          if (sizeLog2 < 40) {
            str += sizeTop + " GB";
          } else {
            if (sizeLog2 < 50) {
              str += sizeTop + " TB";
            } else {
              str += "about ";
              str += sizeTop;
              for (var i = sizeLog2;i >= 50;i -= 10) {
                str += ",000";
              }
              str += " TB";
            }
          }
        }
      }
    }
    return str;
  };
  this.sizeReport = function(doComment, numQubits, numBlockQubits, useDouble) {
    var maxJavaScriptBits = 53;
    var report = "";
    report += numQubits + " qubits, ";
    if (useDouble) {
      report += "double precision<br/>";
    } else {
      report += "single precision<br/>";
    }
    var valueBytesLog2 = 3;
    if (useDouble) {
      valueBytesLog2++;
    }
    var totalDataSizeLog2 = numQubits + valueBytesLog2;
    report += "Required data size: " + (1 << valueBytesLog2) + "*2<sup>" + numQubits + "</sup> = " + this.printDataSizeFromLog2(totalDataSizeLog2);
    return report;
  };
  this.checkQCSettings = function() {
    var notes = "";
    notes += "<b>Current QC Status: </b>";
    if (this.qReg.active) {
      notes += "Active and running, all systems go<br/>";
      notes += this.sizeReport(false, this.qReg.numQubits, this.qReg.numBlockQubits, this.qReg.doublePrecision);
    } else {
      notes += 'Inactive. Press "Start QC Simulation" to activate.<br/>';
    }
    notes += "<hr/>";
    var nq = parseFloat(this.numQubitsInput.value);
    var nbq = parseFloat(this.numBlockQubitsInput.value);
    var useDouble = false;
    if (this.doublePrecisionRadio.checked) {
      useDouble = true;
    }
    notes += "<b>Requested QC Status: </b>";
    notes += this.sizeReport(true, nq, nbq, useDouble);
    this.printNotes(notes);
  };
  this.stopQCSim = function() {
    this.qReg.deactivate();
    this.checkQCSettings();
  };
  this.startQCSim = function() {
    var nq = parseFloat(this.numQubitsInput.value);
    var nbq = parseFloat(this.numBlockQubitsInput.value);
    var useDouble = false;
    if (this.doublePrecisionRadio.checked) {
      useDouble = true;
    }
    this.qReg.deactivate();
    this.qReg.setSize(nq, nbq, useDouble);
    this.qReg.activate();
    this.checkQCSettings();
  };
  this.checkQCSettings();
  return this.panel;
}
;var qc = null;
var qint = null;
var liquid = null;
function QScriptInterface(qReg) {
  this.qReg = qReg;
  this.bitsRequired = 0;
  this.preferredBlockBits = 16;
  this.printBox = null;
  this.qint = new Array;
  this.prev_activated_qubits = 0;
  this.stashed_message = "";
  qint = this.qint;
  qint.numUtil = 0;
  if (!liquid && typeof have_liquid_emulator != "undefined") {
    liquid = new LiquidEmulator(this);
  }
  this.start = function() {
  };
  qint["new"] = function(numBits, name) {
    if (numBits == 0) {
      return null;
    }
    var theInt = new QInt(numBits, qReg, name);
    if (!theInt.valid) {
      return null;
    }
    this[name] = theInt;
    qReg.qIntsChanged();
    return theInt;
  };
  this.print = function(message) {
    if (this.printBox) {
      this.printBox.value += message;
    } else {
      if (message.includes("\n")) {
        if (message.endsWith("\n")) {
          console.log(this.stashed_message + message.substring(0, message.length - 1));
        } else {
          console.log(this.stashed_message + message);
        }
        this.stashed_message = "";
      } else {
        this.stashed_message += message;
      }
    }
  };
  this.reset = function(numBits, preferredBlockBits) {
    if (preferredBlockBits != null) {
      this.preferredBlockBits = preferredBlockBits;
    }
    var blockBits = this.preferredBlockBits;
    if (blockBits > numBits) {
      blockBits = numBits;
    }
    this.qint = new Array;
    this.qReg.position_encoded = false;
    this.qReg.deactivate();
    this.qReg.removeAllQInts();
    this.qReg.setSize(numBits, blockBits, qReg.doublePrecision);
    this.qReg.activate();
    this.qReg.staff.clear();
    this.qReg.use_photon_sim = false;
    this.qReg.changed();
    if (this.chp) {
      this.chp.reset(this.qReg);
    }
    if (this.prev_activated_qubits != this.numQubits) {
      console.log("QCEngine activated: " + this.qReg.numQubits + " qubits.");
    }
    this.prev_activated_qubits = this.qReg.numQubits;
  };
  this.parse_chp_commands = function(program_str) {
    if (this.chp == null) {
      this.chp = new CHPSimulator;
    }
    this.chp.parse_chp_commands(program_str);
  };
  this.start_liquid = function() {
    if (typeof have_liquid_emulator == "undefined") {
      console.log("Need to include qcengine_liquid.js");
      return;
    }
    if (!liquid && typeof have_liquid_emulator != "undefined") {
      liquid = new LiquidEmulator(this);
    }
  };
  this.clearOutput = function() {
    if (this.printBox) {
      this.printBox.value = "";
    }
  };
  this.numQubits = function() {
    if (this.qReg) {
      return this.qReg.numQubits;
    }
    return 0;
  };
  this.renderModel = function() {
    this.qReg.staff.draw();
    this.qReg.staff.renderModel();
  };
  this.pokeValues = function(values_array) {
    var pairs = values_array.length / 2;
    console.log(values_array);
    console.log(pairs);
    for (var i = 0;i < pairs;++i) {
      this.qReg.pokeComplexValue(i, values_array[i * 2], values_array[i * 2 + 1]);
    }
    this.qReg.renormalize();
  };
  this.runLabel = function(label) {
    this.qReg.staff.runLabel(label);
  };
  this.enableAnimation = function() {
    this.qReg.animateWidgets = true;
    this.not = this.anim_not;
    this.cnot = this.anim_cnot;
    this.exchange = this.anim_exchange;
    this.rootexchange = this.anim_rootexchange;
    this.rootexchange_inv = this.anim_rootexchange_inv;
    this.hadamard = this.anim_hadamard;
    this.chadamard = this.anim_chadamard;
    this.rootnot = this.anim_rootnot;
    this.rootnot_inv = this.anim_rootnot_inv;
    this.crootnot = this.anim_crootnot;
    this.crootnot_inv = this.anim_crootnot_inv;
    this.rotatex = this.anim_rotatex;
    this.crotatex = this.anim_crotatex;
    this.rotatey = this.anim_rotatey;
    this.crotatey = this.anim_crotatey;
    this.phase = this.anim_phase;
    this.noise = this.anim_noise;
    this.optical_phase = this.anim_optical_phase;
    this.optical_beamsplitter = this.anim_optical_beamsplitter;
    this.coptical_beamsplitter = this.anim_coptical_beamsplitter;
    this.dual_rail_beamsplitter = this.anim_dual_rail_beamsplitter;
    this.pair_source = this.anim_pair_source;
    this.polarization_grating_in = this.anim_polarization_grating_in;
    this.polarization_grating_out = this.anim_polarization_grating_out;
    this.postselect = this.anim_postselect;
    this.postselect_qubit_pair = this.anim_postselect_qubit_pair;
    this.discard = this.anim_discard;
    this.write = this.anim_write;
    this.read = this.anim_read;
    this.peek = this.anim_peek;
    this.nop = this.anim_nop;
    this.start_photon_sim = this.anim_start_photon_sim;
    this.stop_photon_sim = this.anim_stop_photon_sim;
    this.start_chp_sim = this.anim_start_chp_sim;
    this.stop_chp_sim = this.anim_stop_chp_sim;
    this.push_mixed_state = this.anim_push_mixed_state;
    this.use_mixed_state = this.anim_use_mixed_state;
    this.had = this.hadamard;
    this.chad = this.chadamard;
    this.phaseShift = this.phase;
    this.beamsplitter = this.optical_beamsplitter;
    this.cbeamsplitter = this.coptical_beamsplitter;
    this.rotate = this.rotatex;
    this.rot = this.rotatex;
    this.rotx = this.rotatex;
    this.roty = this.rotatey;
  };
  this.disableAnimation = function() {
    this.qReg.animateWidgets = false;
    this.not = this.fast_not;
    this.cnot = this.fast_cnot;
    this.exchange = this.fast_exchange;
    this.rootexchange = this.fast_rootexchange;
    this.rootexchange_inv = this.fast_rootexchange_inv;
    this.hadamard = this.fast_hadamard;
    this.chadamard = this.fast_chadamard;
    this.rootnot = this.fast_rootnot;
    this.rootnot_inv = this.fast_rootnot_inv;
    this.crootnot = this.fast_crootnot;
    this.crootnot_inv = this.fast_crootnot_inv;
    this.rotatex = this.fast_rotatex;
    this.crotatex = this.fast_crotatex;
    this.rotatey = this.fast_rotatey;
    this.crotatey = this.fast_crotatey;
    this.phase = this.fast_phase;
    this.noise = this.fast_noise;
    this.optical_phase = this.fast_optical_phase;
    this.optical_beamsplitter = this.fast_optical_beamsplitter;
    this.coptical_beamsplitter = this.fast_coptical_beamsplitter;
    this.dual_rail_beamsplitter = this.fast_dual_rail_beamsplitter;
    this.pair_source = this.fast_pair_source;
    this.polarization_grating_in = this.fast_polarization_grating_in;
    this.polarization_grating_out = this.fast_polarization_grating_out;
    this.postselect = this.fast_postselect;
    this.postselect_qubit_pair = this.fast_postselect_qubit_pair;
    this.discard = this.fast_discard;
    this.write = this.fast_write;
    this.read = this.fast_read;
    this.peek = this.fast_peek;
    this.nop = this.fast_nop;
    this.start_photon_sim = this.fast_start_photon_sim;
    this.stop_photon_sim = this.fast_stop_photon_sim;
    this.start_chp_sim = this.fast_start_chp_sim;
    this.stop_chp_sim = this.fast_stop_chp_sim;
    this.push_mixed_state = this.fast_push_mixed_state;
    this.use_mixed_state = this.fast_use_mixed_state;
    this.had = this.hadamard;
    this.chad = this.chadamard;
    this.phaseShift = this.phase;
    this.beamsplitter = this.optical_beamsplitter;
    this.cbeamsplitter = this.coptical_beamsplitter;
    this.rotate = this.rotatex;
    this.rot = this.rotatex;
    this.rotx = this.rotatex;
    this.roty = this.rotatey;
  };
  this.advanceOnAdd = function(enable) {
    this.qReg.staff.advanceOnAdd(enable);
  };
  this.codeLabel = function(codeLabel) {
    this.qReg.staff.setCodeLabel(codeLabel);
  };
  this.advanceToEnd = function() {
    this.qReg.staff.advanceToEnd();
  };
  this.enableRecording = function() {
    this.enableAnimation();
    this.qReg.staff.enableTracking();
  };
  this.disableRecording = function() {
    this.qReg.staff.disableTracking();
  };
  this.clearRecording = function() {
    this.qReg.staff.clear();
  };
  this.repeatFromLabel = function(label) {
    return this.qReg.staff.repeatFromLabel(label);
  };
  this.intTest = function(numBits, name) {
    var theInt = new QInt(numBits, qReg);
    if (theInt.valid) {
      return theInt;
    } else {
      return null;
    }
  };
  this.copyAllProbabilities = function() {
    return this.qReg.copyAllProbabilities();
  };
  this.pokeAllProbabilities = function(new_probabilities) {
    this.qReg.pokeAllProbabilities(new_probabilities);
  };
  this.clear_mbc = function() {
    if (this.qReg.mbc) {
      this.qReg.mbc.clear();
    }
  };
  this.build_mbc_graph = function(use_alt_links) {
    if (this.qReg.mbc == null) {
      this.qReg.mbc = new MeasurementBasedComputationConverter(this.qReg);
    }
    this.qReg.mbc.build_mbc_graph(use_alt_links);
  };
  this.convert_to_mbc = function(append_to_current, ignore_input, use_alt_links) {
    if (this.qReg.mbc == null || this.qReg.mbc.nodes.length == 0) {
      this.build_mbc_graph(use_alt_links);
    }
    this.qReg.mbc.convert_to_mbc(append_to_current, ignore_input, use_alt_links);
  };
  this.fast_not = function(mask) {
    this.qReg.not(mask);
  };
  this.anim_not = function(mask) {
    if (mask == null) {
      mask = this.qReg.allBitsMask;
    }
    this.qReg.staff.addInstructionAfterInsertionPoint("not", mask, 0, 0);
  };
  this.fast_cnot = function(mask, cond) {
    this.qReg.cnot(mask, cond);
  };
  this.anim_cnot = function(mask, cond) {
    if (mask && cond) {
      this.qReg.staff.addInstructionAfterInsertionPoint("cnot", mask, cond, 0);
    }
  };
  this.fast_exchange = function(mask, cond) {
    this.qReg.exchange(mask, cond);
  };
  this.anim_exchange = function(mask, cond) {
    if (mask) {
      this.qReg.staff.addInstructionAfterInsertionPoint("exchange", mask, cond, 0);
    }
  };
  this.fast_rootexchange = function(mask, cond) {
    this.qReg.rootexchange(mask, cond);
  };
  this.anim_rootexchange = function(mask, cond) {
    if (mask) {
      this.qReg.staff.addInstructionAfterInsertionPoint("rootexchange", mask, cond, 0);
    }
  };
  this.fast_rootexchange_inv = function(mask, cond) {
    this.qReg.rootexchange_inv(mask, cond);
  };
  this.anim_rootexchange_inv = function(mask, cond) {
    if (mask) {
      this.qReg.staff.addInstructionAfterInsertionPoint("rootexchange_inv", mask, cond, 0);
    }
  };
  this.fast_hadamard = function(mask) {
    this.qReg.hadamard(mask);
  };
  this.anim_hadamard = function(mask) {
    if (mask == null) {
      mask = this.qReg.allBitsMask;
    }
    this.qReg.staff.addInstructionAfterInsertionPoint("hadamard", mask, 0, 0);
  };
  this.fast_chadamard = function(mask, cond) {
    this.qReg.chadamard(mask, cond);
  };
  this.anim_chadamard = function(mask, cond) {
    if (mask && cond) {
      this.qReg.staff.addInstructionAfterInsertionPoint("chadamard", mask, cond, 0);
    }
  };
  this.fast_rootnot = function(mask) {
    this.fast_crootnot(mask, 0);
  };
  this.anim_rootnot = function(mask) {
    this.anim_crootnot(mask, 0);
  };
  this.fast_rootnot_inv = function(mask) {
    this.fast_crootnot_inv(mask, 0);
  };
  this.anim_rootnot_inv = function(mask) {
    this.anim_crootnot_inv(mask, 0);
  };
  this.fast_crootnot = function(mask, cond) {
    this.qReg.crootnot(mask, cond);
  };
  this.anim_crootnot = function(mask, cond) {
    if (mask == null) {
      mask = this.qReg.allBitsMask;
    }
    this.qReg.staff.addInstructionAfterInsertionPoint("crootnot", mask, cond, 0);
  };
  this.fast_crootnot_inv = function(mask, cond) {
    this.qReg.crootnot_inv(mask, cond);
  };
  this.anim_crootnot_inv = function(mask, cond) {
    if (mask == null) {
      mask = this.qReg.allBitsMask;
    }
    this.qReg.staff.addInstructionAfterInsertionPoint("crootnot_inv", mask, cond, 0);
  };
  this.fast_rotatex = function(thetaDegrees, mask, cond) {
    this.qReg.crotatex(mask, cond, thetaDegrees);
  };
  this.anim_rotatex = function(thetaDegrees, mask, cond) {
    if (mask == null) {
      mask = this.qReg.allBitsMask;
    }
    this.qReg.staff.addInstructionAfterInsertionPoint("crotatex", mask, cond, thetaDegrees);
  };
  this.fast_crotatex = function(thetaDegrees, mask, cond) {
    this.qReg.crotatex(mask, cond, thetaDegrees);
  };
  this.anim_crotatex = function(thetaDegrees, mask, cond) {
    if (mask && cond) {
      this.qReg.staff.addInstructionAfterInsertionPoint("crotatex", mask, cond, thetaDegrees);
    }
  };
  this.fast_rotatey = function(thetaDegrees, mask, cond) {
    this.qReg.crotatey(mask, cond, thetaDegrees);
  };
  this.anim_rotatey = function(thetaDegrees, mask, cond) {
    if (mask == null) {
      mask = this.qReg.allBitsMask;
    }
    this.qReg.staff.addInstructionAfterInsertionPoint("crotatey", mask, cond, thetaDegrees);
  };
  this.fast_crotatey = function(thetaDegrees, mask, cond) {
    this.qReg.crotatey(mask, cond, thetaDegrees);
  };
  this.anim_crotatey = function(thetaDegrees, mask, cond) {
    if (mask && cond) {
      this.qReg.staff.addInstructionAfterInsertionPoint("crotatey", mask, cond, thetaDegrees);
    }
  };
  this.fast_phase = function(thetaDegrees, mask) {
    this.qReg.phaseShift(mask, thetaDegrees);
  };
  this.anim_phase = function(thetaDegrees, mask) {
    if (mask == null) {
      mask = this.qReg.allBitsMask;
    }
    this.qReg.staff.addInstructionAfterInsertionPoint("phase", 0, mask, thetaDegrees);
  };
  this.fast_optical_phase = function(thetaDegrees, mask) {
    this.qReg.optical_phase(mask, thetaDegrees);
  };
  this.anim_optical_phase = function(thetaDegrees, mask) {
    if (mask == null) {
      mask = this.qReg.allBitsMask;
    }
    this.qReg.staff.addInstructionAfterInsertionPoint("optical_phase", 0, mask, thetaDegrees);
  };
  this.fast_noise = function(noiseMagnitude, mask, noiseFunc) {
    this.qReg.noise(noiseMagnitude, mask, noiseFunc);
  };
  this.anim_noise = function(noiseMagnitude, mask, noiseFunc) {
    if (noiseMagnitude == null) {
      noiseMagnitude = 1;
    }
    if (mask == null) {
      mask = this.qReg.allBitsMask;
    }
    this.qReg.staff.addInstructionAfterInsertionPoint("noise", mask, 0, noiseMagnitude);
  };
  this.fast_optical_beamsplitter = function(reflectivity, mask) {
    this.qReg.optical_beamsplitter(mask, reflectivity);
  };
  this.anim_optical_beamsplitter = function(reflectivity, mask) {
    if (reflectivity == null) {
      reflectivity = .5;
    }
    if (mask == null) {
      mask = this.qReg.allBitsMask;
    }
    this.qReg.staff.addInstructionAfterInsertionPoint("optical_beamsplitter", mask, 0, reflectivity);
  };
  this.fast_coptical_beamsplitter = function(reflectivity, mask, cond) {
    this.qReg.optical_beamsplitter(mask, cond, reflectivity);
  };
  this.anim_coptical_beamsplitter = function(reflectivity, mask, cond) {
    if (reflectivity == null) {
      reflectivity = .5;
    }
    if (mask == null) {
      mask = this.qReg.allBitsMask;
    }
    this.qReg.staff.addInstructionAfterInsertionPoint("coptical_beamsplitter", mask, cond, reflectivity);
  };
  this.fast_dual_rail_beamsplitter = function(reflectivity, mask, aux) {
    this.qReg.dual_rail_beamsplitter(mask, null, reflectivity, aux);
  };
  this.anim_dual_rail_beamsplitter = function(reflectivity, mask, aux) {
    if (reflectivity == null) {
      reflectivity = .5;
    }
    this.qReg.staff.addInstructionAfterInsertionPoint("dual_rail_beamsplitter", mask, null, reflectivity, aux);
  };
  this.fast_pair_source = function(mask, cond) {
    this.qReg.pair_source(mask, cond, 0);
  };
  this.anim_pair_source = function(mask, cond) {
    this.qReg.staff.addInstructionAfterInsertionPoint("pair_source", mask, cond, 0);
  };
  this.fast_polarization_grating_in = function(mask, theta) {
    this.qReg.polarization_grating_in(mask, null, theta);
  };
  this.anim_polarization_grating_in = function(mask, theta) {
    if (theta == null) {
      theta = 0;
    }
    this.qReg.staff.addInstructionAfterInsertionPoint("polarization_grating_in", mask, null, theta);
  };
  this.fast_polarization_grating_out = function(mask, theta) {
    this.qReg.polarization_grating_out(mask, cond, theta);
  };
  this.anim_polarization_grating_out = function(mask, theta) {
    if (theta == null) {
      theta = 0;
    }
    this.qReg.staff.addInstructionAfterInsertionPoint("polarization_grating_out", mask, null, theta);
  };
  this.fast_write = function(value, mask) {
    this.qReg.write(mask, value);
  };
  this.anim_write = function(value, mask) {
    if (mask == null) {
      mask = this.qReg.allBitsMask;
    }
    this.qReg.staff.addInstructionAfterInsertionPoint("write", mask, value, 0);
  };
  this.fast_postselect = function(value, mask) {
    this.qReg.postselect(mask, value);
  };
  this.anim_postselect = function(value, mask) {
    if (mask == null) {
      mask = this.qReg.allBitsMask;
    }
    this.qReg.staff.addInstructionAfterInsertionPoint("postselect", mask, value, 0);
  };
  this.fast_postselect_qubit_pair = function(mask) {
    this.qReg.postselect_qubit_pair(mask);
  };
  this.anim_postselect_qubit_pair = function(mask) {
    this.qReg.staff.addInstructionAfterInsertionPoint("postselect_qubit_pair", mask, 0, 0);
  };
  this.fast_discard = function(mask) {
  };
  this.anim_discard = function(mask) {
    if (mask == null) {
      mask = this.qReg.allBitsMask;
    }
    this.qReg.staff.addInstructionAfterInsertionPoint("discard", mask, 0, 0);
  };
  this.fast_read = function(mask) {
    if (mask == null) {
      mask = this.qReg.allBitsMask;
    }
    return this.qReg.read(mask);
  };
  this.anim_read = function(mask) {
    if (mask == null) {
      mask = this.qReg.allBitsMask;
    }
    var inst = this.qReg.staff.addInstructionAfterInsertionPoint("read", mask, 0, 0);
    if (inst) {
      inst.finish();
    }
    return this.qReg.read(mask);
  };
  this.fast_peek = function(mask) {
  };
  this.anim_peek = function(mask) {
    if (mask == null) {
      mask = this.qReg.allBitsMask;
    }
    var inst = this.qReg.staff.addInstructionAfterInsertionPoint("peek", mask, 0, 0);
    if (inst) {
      inst.finish();
    }
  };
  this.fast_nop = function(mask) {
  };
  this.anim_nop = function(mask) {
    if (mask == null) {
      mask = this.qReg.allBitsMask;
    }
    var inst = this.qReg.staff.addInstructionAfterInsertionPoint("nop", mask, 0, 0);
    if (inst) {
      inst.finish();
    }
  };
  this.fast_start_photon_sim = function(mask) {
    this.qReg.startPhotonSim(mask);
  };
  this.anim_start_photon_sim = function(mask) {
    if (mask == null) {
      mask = this.qReg.allBitsMask;
    }
    this.qReg.staff.addInstructionAfterInsertionPoint("start_photon_sim", mask);
  };
  this.fast_stop_photon_sim = function(mask) {
    this.qReg.stopPhotonSim(mask);
  };
  this.anim_stop_photon_sim = function(mask) {
    if (mask == null) {
      mask = this.qReg.allBitsMask;
    }
    this.qReg.staff.addInstructionAfterInsertionPoint("stop_photon_sim", mask);
  };
  this.fast_start_chp_sim = function(mask) {
    this.qReg.startCHPSim(mask);
  };
  this.anim_start_chp_sim = function(mask) {
    if (mask == null) {
      mask = this.qReg.allBitsMask;
    }
    this.qReg.staff.addInstructionAfterInsertionPoint("start_chp_sim", mask);
  };
  this.fast_stop_chp_sim = function(mask) {
    this.qReg.stopCHPSim(mask);
  };
  this.anim_stop_chp_sim = function(mask) {
    if (mask == null) {
      mask = this.qReg.allBitsMask;
    }
    this.qReg.staff.addInstructionAfterInsertionPoint("stop_chp_sim", mask);
  };
  this.fast_push_mixed_state = function(name, mask) {
    return this.qReg.pushMixedState(mask, name);
  };
  this.anim_push_mixed_state = function(name, mask) {
    if (mask == null) {
      mask = this.qReg.allBitsMask;
    }
    var inst = this.qReg.staff.addInstructionAfterInsertionPoint("push_mixed", mask, null, name);
    if (inst) {
      inst.finish();
    }
    return this.qReg.mixed_states.length - 1;
  };
  this.fast_use_mixed_state = function(params, mask) {
    this.qReg.useMixedState(mask, params);
  };
  this.anim_use_mixed_state = function(params, mask) {
    if (mask == null) {
      mask = this.qReg.allBitsMask;
    }
    this.qReg.staff.addInstructionAfterInsertionPoint("use_mixed", mask, null, params);
  };
  this.enableAnimation();
  this.clearRecording();
  this.qReg.changed();
  return this;
}
function runQCScript(scriptText, outputAreaItem, scopeBrackets) {
  qc.start();
  if (outputAreaItem) {
    qc.printBox = outputAreaItem;
  }
  if (scopeBrackets) {
    scriptText = "{" + scriptText + "}";
  }
  var startTime = (new Date).getTime();
  eval(scriptText);
  var elapsedTimeMS = (new Date).getTime() - startTime;
  qc.print("\n(Finished in " + elapsedTimeMS / 1E3 + " seconds.)\n");
  if (outputAreaItem) {
    outputAreaItem.scrollTop = outputAreaItem.scrollHeight;
  }
}
function runQCScriptInTextArea(textAreaName, outputAreaName, scopeBrackets) {
  var outputAreaItem = null;
  if (outputAreaName) {
    outputAreaItem = document.getElementById(outputAreaName);
  }
  var scriptText;
  if (textAreaName == "editor") {
    scriptText = editor.getValue();
  } else {
    var box = document.getElementById(textAreaName);
    scriptText = box.value;
  }
  runQCScript(scriptText, outputAreaItem, scopeBrackets);
}
var kickstart_qc = {start:function() {
  qc = new QScriptInterface(panel_staff.staff.qReg);
}, codeLabel:function(label) {
  this.start();
  qc.codeLabel(label);
}, reset:function(numBits, preferredBlockBits) {
  this.start();
  qc.reset(numBits, preferredBlockBits);
}};
qc = kickstart_qc;
var allPanels = new Array;
var draggedPanel = null;
var draggedFrameCount = 0;
var dragMode = "move";
var panel_stopwatch = null;
var panel_chart = null;
var panel_staff = null;
var panel_chip = null;
var panel_script = null;
var panel_setup = null;
var panel_script = null;
function Panel(canvas, div) {
  this.canvas = canvas;
  this.div = div;
  div.panel = this;
  this.widgets = new Array;
  this.mouseX = 0;
  this.mouseY = 0;
  this.growBoxSize = 16;
  if (this.canvas) {
    this.canvas.panel = this;
  }
  this.dragMouseStartX = 0;
  this.dragMouseStartY = 0;
  this.dragCanvasStartX = 0;
  this.dragCanvasStartY = 0;
  this.draw = function() {
    if (this.canvas) {
      var canvas = this.canvas;
      var ctx = canvas.getContext("2d");
      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      for (var i = 0;i < this.widgets.length;++i) {
        this.widgets[i].draw();
      }
      if (this.growBoxSize > 0) {
        this.drawGrowBox(ctx);
      }
    }
  };
  this.startAnimation = function(instruction) {
    var alreadyAnimating = false;
    if (this.animationRemainingTimeSec > 0) {
      alreadyAnimating = true;
    }
    this.animationRemainingTimeSec = this.animationTotalTimeSec;
    if (alreadyAnimating) {
      this.animationInstruction = null;
    } else {
      this.animationInstruction = instruction;
      this.updateAnimation();
    }
  };
  this.updateAnimation = function() {
    this.animationRemainingTimeSec -= this.animationIntervalMS / 1E3;
    if (this.animationRemainingTimeSec <= 0) {
      this.animationRemainingTimeSec = 0;
    }
    this.draw();
    var self = this;
    if (this.animationRemainingTimeSec > 0) {
      setTimeout(function() {
        self.updateAnimation();
      }, this.animationIntervalMS);
    }
  };
  this.setSize = function(width, height) {
    this.width = width;
    this.height = height;
    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.div.style.width = width + "px";
    this.div.style.height = height + "px";
    this.draw();
  };
  this.setPos = function(left, top) {
    this.div.style.left = left + "px";
    this.div.style.top = top + "px";
    if (this.attach_div) {
      this.attach_div.style.left = left + this.attach_div_offset.x + "px";
      this.attach_div.style.top = top + this.attach_div_offset.y + "px";
    }
  };
  this.setVisible = function(visible) {
    var vis = "none";
    if (visible) {
      if (!this.isVisible()) {
        this.bringToFront();
      }
      vis = "block";
    }
    this.div.style.display = vis;
    if (this.attach_div) {
      this.attach_div.style.display = vis;
    }
  };
  this.isVisible = function() {
    return this.div.style.display != "none";
  };
  this.toggleVisible = function() {
    this.setVisible(!this.isVisible());
  };
  this.bringToFront = function() {
    document.body.removeChild(this.div);
    document.body.appendChild(this.div);
  };
  this.getMousePos = function(e) {
    if (e.offsetX) {
      this.mouseX = e.offsetX;
      this.mouseY = e.offsetY;
    } else {
      if (e.layerX) {
        this.mouseX = e.layerX;
        this.mouseY = e.layerY;
      }
    }
  };
  this.div.ondblclick = function(e) {
    e.Handled = true;
  };
  this.drawCloseBox = function(ctx) {
  };
  this.drawGrowBox = function(ctx) {
    ctx.strokeStyle = "black";
    ctx.fillStyle = "white";
    ctx.globalAlpha = .5;
    var x = this.width - this.growBoxSize;
    var y = this.height - this.growBoxSize;
    var w = this.growBoxSize * 1.5;
    var h = this.growBoxSize * 1.5;
    var radius = 4;
    rounded_rect(ctx, x, y, w, h, radius, true, true);
    ctx.globalAlpha = 1;
  };
  this.inCloseBox = function(x, y) {
    return x >= this.width - this.growBoxSize && y <= this.growBoxSize;
  };
  this.inGrowBox = function(x, y) {
    return x >= this.width - this.growBoxSize && y >= this.height - this.growBoxSize;
  };
  this.div.onmousedown = function(e) {
    this.panel.getMousePos(e);
    for (var i = this.panel.widgets.length - 1;i >= 0 && !e.Handled;--i) {
      e.Handled = this.panel.widgets[i].mouseDown(this.panel.mouseX - this.panel.widgets[i].pos.x, this.panel.mouseY - this.panel.widgets[i].pos.y);
    }
    if (!e.Handled) {
      this.panel.dragMouseStartX = e.pageX;
      this.panel.dragMouseStartY = e.pageY;
      this.panel.dragCanvasStartX = parseInt(this.panel.div.style.left);
      this.panel.dragCanvasStartY = parseInt(this.panel.div.style.top);
      this.panel.dragCanvasStartW = parseInt(this.panel.div.style.width);
      this.panel.dragCanvasStartH = parseInt(this.panel.div.style.height);
      draggedPanel = this.panel;
      draggedFrameCount = 0;
      if (this.panel.inGrowBox(this.panel.mouseX, this.panel.mouseY)) {
        dragMode = "resize";
      } else {
        if (this.panel.inCloseBox(this.panel.mouseX, this.panel.mouseY)) {
          dragMode = "close";
        } else {
          dragMode = "move";
        }
      }
    }
    return false;
  };
  this.div.onwheel = function(e) {
    for (var i = this.panel.widgets.length - 1;i >= 0 && !e.Handled;--i) {
      if (this.panel.widgets[i].mouseWheel) {
        e.Handled = this.panel.widgets[i].mouseWheel(e);
      }
    }
    if (!e.Handled) {
    }
    return false;
  };
  this.div.onmouseup = function(e) {
    this.panel.getMousePos(e);
    for (var i = this.panel.widgets.length - 1;i >= 0 && !e.Handled;--i) {
      e.Handled = this.panel.widgets[i].mouseUp(this.panel.mouseX - this.panel.widgets[i].pos.x, this.panel.mouseY - this.panel.widgets[i].pos.y);
    }
  };
  this.div.onmousemove = function(e) {
    this.panel.getMousePos(e);
    for (var i = this.panel.widgets.length - 1;i >= 0 && !e.Handled;--i) {
      e.Handled = this.panel.widgets[i].mouseMove(this.panel.mouseX - this.panel.widgets[i].pos.x, this.panel.mouseY - this.panel.widgets[i].pos.y);
    }
    return false;
  };
  this.setVisible(false);
}
document.onmouseup = function(e) {
  if (draggedPanel && dragMode == "close") {
    draggedPanel.getMousePos(e);
    if (draggedPanel.inCloseBox(draggedPanel.mouseX, draggedPanel.mouseY)) {
      draggedPanel.setVisible(false);
    }
  }
  draggedPanel = null;
  return true;
};
document.onmousemove = function(e) {
  var mx = e.pageX;
  var my = e.pageY;
  if (draggedPanel) {
    if (draggedFrameCount == 0) {
      draggedPanel.bringToFront();
    }
    draggedFrameCount++;
    if (dragMode == "move") {
      var x = draggedPanel.dragCanvasStartX + mx - draggedPanel.dragMouseStartX;
      var y = draggedPanel.dragCanvasStartY + my - draggedPanel.dragMouseStartY;
      if (x < 0) {
        x = 0;
      }
      if (y < 0) {
        y = 0;
      }
      draggedPanel.setPos(x, y);
    } else {
      if (dragMode == "resize") {
        var x = draggedPanel.dragCanvasStartW + mx - draggedPanel.dragMouseStartX;
        var y = draggedPanel.dragCanvasStartH + my - draggedPanel.dragMouseStartY;
        if (x < 64) {
          x = 64;
        }
        if (y < 64) {
          y = 64;
        }
        draggedPanel.setSize(x, y);
      }
    }
  }
};
document.ontouchstart = function(e) {
  console.log("ontouchstart!");
  document.onmousedown(e);
};
document.ontouchend = function() {
  console.log("ontouchend!");
  document.onmouseup(e);
};
document.ontouchmove = function() {
  console.log("ontouchmove!");
  document.onmousemove(e);
};
function radialPos(center, thetaDegrees, radius) {
  var thetaRadians = thetaDegrees * Math.PI / 180;
  var sval = Math.sin(thetaRadians);
  var cval = Math.cos(thetaRadians);
  return new Vec2(center.x + radius * sval, center.y + radius * -cval);
}
function createDiv(x, y) {
  var divTag = document.createElement("div");
  divTag.id = "stopwatchDiv";
  divTag.style.margin = "0px auto";
  divTag.style.position = "absolute";
  divTag.style.left = x;
  divTag.style.top = y;
  divTag.style.border = "1px solid #999";
  divTag.style.zIndex = 2;
  divTag.style.shadow = "0 0 30px 5px #999";
  divTag.style.cssText += "-moz-box-shadow: 0 0 30px 5px #999; -webkit-box-shadow: 0 0 30px 5px #999;";
  divTag.onselectstart = function() {
    return false;
  };
  divTag.onmousedown = function() {
    return false;
  };
  document.body.appendChild(divTag);
  return divTag;
}
function createStopwatchPanel(myReg, x, y) {
  var div = createDiv(x, y);
  var canvas = document.createElement("canvas");
  div.appendChild(canvas);
  var panel = new Panel(canvas, div);
  panel.setSize(602 / 2 + 50, 854 / 2 + 20);
  var stopwatchQubit = 1;
  var watch = new QStopwatch(myReg, stopwatchQubit, panel, new Vec2(0, 0));
  var center = watch.dialCenterPos();
  center.x -= 16;
  center.y -= 16;
  var thetaDegrees = -2;
  var dtheta = 19;
  var buttonRadius = 160;
  var buttonPos = radialPos(center, thetaDegrees, buttonRadius);
  new QNotCharm(myReg, panel, buttonPos, stopwatchQubit, "not");
  buttonPos = radialPos(center, thetaDegrees + dtheta * 1, buttonRadius);
  new QCoinTossCharm(myReg, panel, buttonPos, stopwatchQubit, "random");
  buttonPos = radialPos(center, thetaDegrees + dtheta * 2, buttonRadius);
  new QHadamardCharm(myReg, panel, buttonPos, stopwatchQubit, "hadamard");
  buttonPos = radialPos(center, thetaDegrees + dtheta * 3, buttonRadius);
  new QRotateCharm(myReg, panel, buttonPos, stopwatchQubit, "rotate");
  buttonPos = radialPos(center, thetaDegrees + dtheta * 4, buttonRadius);
  new QPhaseShiftCharm(myReg, panel, buttonPos, stopwatchQubit, "phase shift");
  buttonPos = radialPos(center, thetaDegrees + dtheta * 5, buttonRadius);
  new QCat(myReg, panel, buttonPos);
  return panel;
}
function createStaffPanel(myReg, x, y) {
  var div = createDiv(x, y);
  var canvas = document.createElement("canvas");
  div.appendChild(canvas);
  var panel = new Panel(canvas, div);
  panel.setSize(500, 150);
  new QStaff(myReg, panel, new Vec2(0, 0));
  return panel;
}
function createChartPanel(myReg, x, y) {
  var div = createDiv(x, y);
  var canvas = document.createElement("canvas");
  var int_menu_select = document.createElement("select");
  var int_menu_div = document.createElement("div");
  div.appendChild(canvas);
  int_menu_div.appendChild(int_menu_select);
  int_menu_div.style.width = "20" + "px";
  int_menu_div.style.height = "40" + "px";
  int_menu_div.style.position = "relative";
  int_menu_div.style.zIndex = 1;
  int_menu_div.style.left = 30;
  int_menu_div.style.top = 30;
  int_menu_div.style.display = "none";
  document.body.appendChild(int_menu_div);
  var panel = new Panel(canvas, div);
  panel.setSize(500, 200);
  panel.int_menu_select = int_menu_select;
  new QChart(myReg, panel, new Vec2(0, 0));
  return panel;
}
function activateStopwatch() {
  panel_stopwatch = createStopwatchPanel(panel_staff.staff.qReg, 130, 360);
  allPanels.push(panel_stopwatch);
}
function createAllPanels(panelList) {
  var numQubits = 1;
  var blockQubits = 1;
  var myReg = new QReg(numQubits, blockQubits, false);
  var myInt = new QInt(numQubits, myReg);
  myReg.activate();
  myReg.writeAll(1);
  panel_setup = createSetupPanel(myReg, 520, 100);
  panelList.push(panel_setup);
  panel_staff = createStaffPanel(myReg, 600, 470);
  panelList.push(panel_staff);
  panel_chart = createChartPanel(myReg, 580, 270);
  panelList.push(panel_chart);
  qReg.changed();
}
function DrawAllPanels() {
  for (var i = 0;i < allPanels.length;++i) {
    allPanels[i].draw();
  }
}
function rounded_rect(ctx, x, y, width, height, radius, do_stroke, do_fill) {
  ctx.beginPath();
  ctx.moveTo(x, y + radius);
  ctx.lineTo(x, y + height - radius);
  ctx.quadraticCurveTo(x, y + height, x + radius, y + height);
  ctx.lineTo(x + width - radius, y + height);
  ctx.quadraticCurveTo(x + width, y + height, x + width, y + height - radius);
  ctx.lineTo(x + width, y + radius);
  ctx.quadraticCurveTo(x + width, y, x + width - radius, y);
  ctx.lineTo(x + radius, y);
  ctx.quadraticCurveTo(x, y, x, y + radius);
  if (do_stroke) {
    ctx.stroke();
  }
  if (do_fill) {
    ctx.fill();
  }
}
function rounded_rect_nosides(ctx, x, y, width, height, radius, do_stroke, do_fill) {
  ctx.beginPath();
  ctx.moveTo(x, y + radius);
  ctx.moveTo(x, y + height - radius);
  ctx.quadraticCurveTo(x, y + height, x + radius, y + height);
  ctx.lineTo(x + width - radius, y + height);
  ctx.quadraticCurveTo(x + width, y + height, x + width, y + height - radius);
  ctx.moveTo(x + width, y + radius);
  ctx.quadraticCurveTo(x + width, y, x + width - radius, y);
  ctx.lineTo(x + radius, y);
  ctx.quadraticCurveTo(x, y, x, y + radius);
  if (do_stroke) {
    ctx.stroke();
  }
  if (do_fill) {
    ctx.fill();
  }
}
function rounded_rect_leftonly(ctx, x, y, width, height, radius, do_stroke, do_fill) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.quadraticCurveTo(x, y, x, y + radius);
  ctx.lineTo(x, y + radius);
  ctx.lineTo(x, y + height - radius);
  ctx.quadraticCurveTo(x, y + height, x + radius, y + height);
  if (do_stroke) {
    ctx.stroke();
  }
  if (do_fill) {
    ctx.fill();
  }
}
function draw_text(ctx, str, x, y, pts, style_str, color, halign, valign) {
  ctx.fillStyle = color;
  ctx.textAlign = halign;
  ctx.textBaseline = valign;
  ctx.font = make_font_size(pts, style_str);
  ctx.fillText(str, x, y);
  return y;
}
function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
function make_time_str(minutes) {
  var hours = Math.floor(minutes / 60);
  var min_digit_10 = Math.floor(minutes % 60 / 10);
  var min_digit_1 = minutes % 10;
  return "" + hours + ":" + min_digit_10 + "" + min_digit_1;
}
function make_font_size(pts, style_str) {
  return style_str + " " + pts.toFixed(1) + "px Helvetica";
}
function ImageLoaded() {
  DrawAllPanels();
}
function Initialize() {
  createAllPanels(allPanels);
  LoadUserName();
}
Initialize();
function is_complex(num) {
  return num.re != null;
}
function get_re(num) {
  if (is_complex(num)) {
    return num.re;
  }
  return num;
}
function get_im(num) {
  if (is_complex(num)) {
    return num.im;
  }
  return 0;
}
function to_complex(re, im) {
  if (re.re) {
    return re;
  }
  if (im == null) {
    im = 0;
  }
  return {re:re, im:im};
}
function complex_add(a, b) {
  var ar = get_re(a);
  var ai = get_im(a);
  var br = get_re(b);
  var bi = get_im(b);
  return to_complex(ar + br, ai + bi);
}
function complex_mul(a, b) {
  var ar = get_re(a);
  var ai = get_im(a);
  var br = get_re(b);
  var bi = get_im(b);
  return to_complex(ar * br - ai * bi, ar * bi + ai * br);
}
function complex_str(num) {
  return "(" + get_re(num) + "+i" + get_im(num) + ")";
}
function mode_to_photon_count_str(mode_to_photon_count) {
  var str = "";
  for (var i = 0;i < mode_to_photon_count.length;++i) {
    var count = mode_to_photon_count[i];
    str += count ? count : "-";
  }
  return str;
}
function PhotonSimState(sim, state_index, mode_to_photon_count) {
  var factorial = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800];
  this.sim = sim;
  this.mode_to_photon_count = [];
  this.logical_value = 0;
  this.logical_value_bf = new BitField(sim.qReg.numQubits);
  this.logical_value_bf.set(0);
  this.normalization_const = 1;
  this.photon_to_mode = [];
  for (var i = 0;i < mode_to_photon_count.length;++i) {
    var count = mode_to_photon_count[i];
    if (count) {
      this.logical_value |= 1 << i;
      this.logical_value_bf.setBit(i, 1);
    }
    this.mode_to_photon_count.push(count);
    this.normalization_const *= factorial[count];
    for (var j = 0;j < count;++j) {
      this.photon_to_mode.push(i);
    }
  }
  this.state_index = state_index;
  this.matches = function(mode_to_photon_count) {
    if (mode_to_photon_count.length != this.mode_to_photon_count.length) {
      return false;
    }
    for (var i = 0;i < mode_to_photon_count.length;++i) {
      if (mode_to_photon_count[i] != this.mode_to_photon_count[i]) {
        return false;
      }
    }
    return true;
  };
  this.amplitude = function() {
    return to_complex(this.sim.state_data[this.state_index * 2], this.sim.state_data[this.state_index * 2 + 1]);
  };
  this.mode_str = function() {
    var str = mode_to_photon_count_str(this.mode_to_photon_count);
    str += "/";
    for (var i = 0;i < this.photon_to_mode.length;++i) {
      str += this.photon_to_mode[i];
    }
    return str;
  };
  this.print = function(message) {
    var str = "";
    if (message) {
      str += message;
    }
    str += " state " + this.state_index + ": " + this.mode_str() + " " + complex_str(this.amplitude());
    console.log(str);
  };
}
function PhotonSim() {
  this.reset = function(qReg, targetQubits, this_instruction) {
    this.verbose = false;
    this.mode_names = [];
    for (var bit = 0;bit < qReg.numQubits;++bit) {
      var int_name = qReg.getQubitIntName(bit);
      var place_name = qReg.getQubitIntPlace(bit);
      var str = "(" + int_name;
      if (int_name == "" || place_name != "1") {
        str += ":" + place_name;
      }
      str += ")";
      this.mode_names.push(str);
    }
    this.qReg = qReg;
    var starter_states = 1;
    var bitmask = new BitField(qReg.numQubits);
    this.countLogicalPhotons();
    if (this.num_photons == 0) {
      console.log("There are no photons.");
      return;
    }
    var state_verbose = false;
    this.states = [];
    var mode_to_photon_count = new Array(this.qReg.numQubits);
    var old_states = [];
    var current_states = [];
    for (var value_index = 0;value_index < this.qReg.numValues;++value_index) {
      var cval = this.qReg.peekComplexValue(value_index);
      if (cval.x || cval.y) {
        for (var mode_index = 0;mode_index < this.qReg.numQubits;++mode_index) {
          mode_to_photon_count[mode_index] = value_index >> mode_index & 1;
        }
        if (state_verbose) {
          console.log("--------------- Adding scan-states for " + mode_to_photon_count_str(mode_to_photon_count));
        }
        var new_state_start = this.states.length;
        var start_state = this.addStateIfNew(mode_to_photon_count);
        var new_state_end = this.states.length;
        if (new_state_end != new_state_start) {
          current_states.push(start_state);
        }
        var active = false;
        for (inst_index = 0;inst_index < qReg.staff.instructions.length;++inst_index) {
          var inst = qReg.staff.instructions[inst_index];
          if (inst == this_instruction) {
            active = true;
          } else {
            if (inst.op == "stop_photon_sim") {
              active = false;
            }
          }
          if (active) {
            if (inst.op == "dual_rail_beamsplitter" || inst.op == "exchange") {
              old_states = current_states;
              current_states = [];
              if (state_verbose) {
                console.log("instruction " + inst_index + " of " + qReg.staff.instructions.length + ", looking at " + old_states.length + " states...");
              }
              var low = inst.targetQubits.getLowestBitIndex();
              var high = inst.targetQubits.getHighestBitIndex();
              for (var st = 0;st < old_states.length;++st) {
                var parent_state = old_states[st];
                if (state_verbose) {
                  console.log("  parent =  " + parent_state.mode_str());
                }
                for (var mode_index = 0;mode_index < this.qReg.numQubits;++mode_index) {
                  mode_to_photon_count[mode_index] = parent_state.mode_to_photon_count[mode_index];
                }
                var a = mode_to_photon_count[low];
                var b = mode_to_photon_count[high];
                if (inst.op == "exchange") {
                  mode_to_photon_count[low] = b;
                  mode_to_photon_count[high] = a;
                  var state1 = this.addStateIfNew(mode_to_photon_count);
                  var found = false;
                  for (var i = 0;i < current_states.length && !found;++i) {
                    if (current_states[i] == state1) {
                      found = true;
                    }
                  }
                  if (!found) {
                    current_states.push(state1);
                  }
                } else {
                  if (inst.op == "dual_rail_beamsplitter") {
                    for (var i = 0;i <= a + b;++i) {
                      mode_to_photon_count[low] = i;
                      mode_to_photon_count[high] = a + b - i;
                      var state1 = this.addStateIfNew(mode_to_photon_count);
                      var found = false;
                      for (var j = 0;j < current_states.length && !found;++j) {
                        if (current_states[j] == state1) {
                          found = true;
                        }
                      }
                      if (!found) {
                        current_states.push(state1);
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    this.num_states = this.states.length;
    if (this.verbose) {
      console.log("States required: " + this.num_states);
    }
    var bytes_per_float = 8;
    if (qReg.doublePrecision) {
      bytes_per_float = 8;
    }
    this.num_data_floats = 2 * this.num_states;
    this.num_data_bytes = this.num_data_floats * bytes_per_float;
    if (bytes_per_float == 4) {
      this.state_data = new Float32Array(new ArrayBuffer(this.num_data_bytes));
      this.state_data_scratch = new Float32Array(new ArrayBuffer(this.num_data_bytes));
    } else {
      this.state_data = new Float64Array(new ArrayBuffer(this.num_data_bytes));
      this.state_data_scratch = new Float64Array(new ArrayBuffer(this.num_data_bytes));
    }
  };
  this.addStateIfNew = function(mode_to_photon_count) {
    var found = false;
    for (var i = 0;i < this.states.length && !found;++i) {
      if (this.states[i].matches(mode_to_photon_count)) {
        return this.states[i];
      }
    }
    var state = new PhotonSimState(this, this.states.length, mode_to_photon_count);
    this.states.push(state);
    return state;
  };
  this.printState = function(message) {
    var str = "";
    if (message) {
      str += message;
    }
    str += "photonic sim state: \n";
    console.log(str);
    if (!this.states || !this.states.length) {
      console.log("There are no photons.");
      return;
    }
    for (var i = 0;i < this.states.length;++i) {
      this.states[i].print();
    }
  };
  this.countLogicalPhotons = function() {
    this.num_photons = 0;
    for (var value_index = 0;value_index < this.qReg.numValues;++value_index) {
      var cval = this.qReg.peekComplexValue(value_index);
      if (cval.x || cval.y) {
        var one_bits = 0;
        var mask = value_index;
        while (mask) {
          one_bits += mask & 1;
          mask >>= 1;
        }
        if (this.num_photons < one_bits) {
          this.num_photons = one_bits;
        }
      }
    }
    if (this.verbose) {
      console.log("Number of logical photons: " + this.num_photons);
    }
  };
  this.transferLogicalToPhotonic = function() {
    for (var i = 0;i < this.num_data_floats;++i) {
      this.state_data[i] = 0;
    }
    for (var value_index = 0;value_index < this.qReg.numValues;++value_index) {
      var cval = this.qReg.peekComplexValue(value_index);
      if (cval.x || cval.y) {
        for (var state_index = 0;state_index < this.num_states;++state_index) {
          var state = this.states[state_index];
          if (state.logical_value == value_index) {
            this.state_data[state_index * 2] = cval.x;
            this.state_data[state_index * 2 + 1] = cval.y;
            break;
          }
        }
      }
    }
    if (this.verbose) {
      this.printState("Imported from logical");
    }
  };
  this.transferPhotonicToLogical = function() {
    this.qReg.setZero();
    var values_used = 0;
    for (var state_index = 0;state_index < this.num_states;++state_index) {
      var state = this.states[state_index];
      var ar = this.state_data[state_index * 2];
      var ai = this.state_data[state_index * 2 + 1];
      if (ar || ai) {
        var cv = this.qReg.peekComplexValue(state.logical_value);
        cv.x += ar;
        cv.y += ai;
        this.qReg.pokeComplexValue(state.logical_value, cv.x, cv.y);
        values_used++;
      }
    }
    if (values_used == 0) {
      console.log("Photon state ended empty. Likely error.");
      this.qReg.pokeComplexValue(0, 1, 0);
    }
    this.qReg.renormalize();
    this.qReg.changed();
  };
  this.findNonZeroStates = function() {
    this.non_zero_states = [];
    for (var state_index = 0;state_index < this.num_states;++state_index) {
      var state = this.states[state_index];
      var ar = this.state_data[state_index * 2];
      var ai = this.state_data[state_index * 2 + 1];
      if (ar * ar + ai * ai > 1E-5) {
        this.non_zero_states.push(state_index);
      }
    }
  };
  this.getNonZeroState = function(index) {
    var state_index = this.non_zero_states[index];
    return this.states[state_index];
  };
  this.getNonZeroStateLabel = function(index) {
    var state_index = this.non_zero_states[index];
    var state = this.states[state_index];
    return mode_to_photon_count_str(state.mode_to_photon_count);
  };
  this.getNonZeroStateComplexMag = function(index) {
    var state_index = this.non_zero_states[index];
    var ar = this.state_data[state_index * 2];
    var ai = this.state_data[state_index * 2 + 1];
    return new Vec2(ar, ai);
  };
  this.print_mat = function(mat, name) {
    var str = "" + name + ": [[";
    for (var row = 0;row < mat.length;++row) {
      str += "[";
      for (var col = 0;col < mat[row].length;++col) {
        str += complex_str(mat[row][col]);
        if (col < mat[row].length - 1) {
          str += ", ";
        }
      }
      str += "]";
    }
    str += "]";
    console.log(str);
  };
  this.normalization_const = function(modes) {
    var factorial = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800];
    var done = false;
    var result = 1;
    for (var i = 0;!done;++i) {
      done = true;
      var count = 0;
      for (var j = 0;j < modes.length;++j) {
        if (modes[j] == i) {
          count++;
          result *= count;
        } else {
          if (modes[j] > i) {
            done = false;
          }
        }
      }
    }
    return result;
  };
  this.permanent = function(mat) {
    if (this.perm_scratch == null) {
      this.perm_scratch = [1];
    }
    while (this.perm_scratch.length < mat.length) {
      var len = this.perm_scratch.length;
      var scratch_mat = new Array(len);
      for (var i = 0;i < len;++i) {
        scratch_mat[i] = new Array(len);
      }
      this.perm_scratch.push(scratch_mat);
    }
    if (mat.length == 1) {
      return mat[0][0];
    }
    if (mat.length == 2) {
      return complex_add(complex_mul(mat[0][0], mat[1][1]), complex_mul(mat[0][1], mat[1][0]));
    }
    if (mat.length == 3) {
      var perm = 0;
      perm = complex_add(perm, complex_mul(mat[0][0], complex_mul(mat[1][2], mat[2][1])));
      perm = complex_add(perm, complex_mul(mat[0][0], complex_mul(mat[1][1], mat[2][2])));
      perm = complex_add(perm, complex_mul(mat[0][1], complex_mul(mat[1][0], mat[2][2])));
      perm = complex_add(perm, complex_mul(mat[0][1], complex_mul(mat[1][2], mat[2][0])));
      perm = complex_add(perm, complex_mul(mat[0][2], complex_mul(mat[1][0], mat[2][1])));
      perm = complex_add(perm, complex_mul(mat[0][2], complex_mul(mat[1][1], mat[2][0])));
      return perm;
    }
    var perm = 0;
    var mat2 = this.perm_scratch[mat.length - 1];
    for (var pick = 0;pick < mat.length;++pick) {
      for (var i = 0;i < mat.length - 1;++i) {
        var src = 0;
        for (var j = 0;j < mat.length - 1;++j) {
          if (src == pick) {
            src++;
          }
          mat2[i][j] = mat[i + 1][src++];
        }
      }
      perm = complex_add(perm, complex_mul(mat[0][pick], this.permanent(mat2)));
    }
    return perm;
    console.log("Error: TODO more permanent calcs");
    crash.here();
  };
  this.beamsplitter = function(targetQubits, reflectivity) {
    if (reflectivity == null) {
      reflectivity = .5;
    }
    var root_r = Math.sqrt(reflectivity);
    var root_one_minus_r = Math.sqrt(1 - reflectivity);
    var m00r = root_r;
    var m11r = root_r;
    var m10i = root_one_minus_r;
    var m01i = root_one_minus_r;
    var bit0 = getLowestBitIndex(targetQubits);
    var bit1 = getHighestBitIndex(targetQubits);
    if (this.num_photons == 0) {
      console.log("There are no photons.");
      return;
    }
    var umat = new Array(this.num_photons);
    for (var i = 0;i < this.num_photons;++i) {
      umat[i] = new Array(this.num_photons);
    }
    var unitary = new Array(this.qReg.numQubits);
    for (var i = 0;i < this.qReg.numQubits;++i) {
      unitary[i] = new Array(this.qReg.numQubits);
      for (var j = 0;j < this.qReg.numQubits;++j) {
        unitary[i][j] = i == j ? 1 : 0;
      }
    }
    unitary[bit0][bit0] = unitary[bit1][bit1] = to_complex(root_r, 0);
    unitary[bit1][bit0] = unitary[bit0][bit1] = to_complex(0, root_one_minus_r);
    if (this.verbose) {
      this.print_mat(unitary, "unitary");
    }
    for (var i = 0;i < this.num_data_floats;++i) {
      this.state_data_scratch[i] = 0;
    }
    for (var state_index0 = 0;state_index0 < this.num_states;++state_index0) {
      var state0 = this.states[state_index0];
      if (this.verbose) {
        state0.print("from: ");
      }
      var ar = this.state_data[state_index0 * 2];
      var ai = this.state_data[state_index0 * 2 + 1];
      if (ar || ai) {
        var amplitude = {re:ar, im:ai};
        for (var state_index1 = 0;state_index1 < this.num_states;++state_index1) {
          var state1 = this.states[state_index1];
          if (this.verbose) {
            console.log("");
          }
          if (this.verbose) {
            state1.print("  to: ");
          }
          for (var r = 0;r < this.num_photons;++r) {
            for (var c = 0;c < this.num_photons;++c) {
              umat[r][c] = unitary[state1.photon_to_mode[r]][state0.photon_to_mode[c]];
            }
          }
          var n0 = state0.normalization_const;
          var n1 = state1.normalization_const;
          var bit0_change = state0.mode_to_photon_count[bit0] - state1.mode_to_photon_count[bit0];
          var bit1_change = state0.mode_to_photon_count[bit1] - state1.mode_to_photon_count[bit1];
          var perm = 0;
          perm = this.permanent(umat);
          var value = complex_mul(complex_mul(amplitude, perm), 1 / Math.sqrt(n0 * n1));
          if (this.verbose) {
            console.log("contrib to " + state1.mode_str() + " from " + state0.mode_str() + " is " + complex_str(value) + " perm: " + complex_str(perm) + " n0: " + n0 + " n1: " + n1);
          }
          this.state_data_scratch[state_index1 * 2] += get_re(value);
          this.state_data_scratch[state_index1 * 2 + 1] += get_im(value);
        }
        if (this.verbose) {
          console.log("");
        }
      }
    }
    var temp = this.state_data;
    this.state_data = this.state_data_scratch;
    this.state_data_scratch = temp;
    if (this.verbose) {
      this.printState("-> beamsplitter result ");
    }
  };
  this.beamsplitter_aux = function(auxQubits, reflectivity) {
    if (reflectivity == null) {
      reflectivity = .5;
    }
    var root_r = Math.sqrt(reflectivity);
    for (var state_index = 0;state_index < this.num_states;++state_index) {
      var state = this.states[state_index];
      if (state.logical_value_bf.andIsNotEqualZero(auxQubits)) {
        var ar = this.state_data[state_index * 2];
        var ai = this.state_data[state_index * 2 + 1];
        this.state_data[state_index * 2] = root_r * ar;
        this.state_data[state_index * 2 + 1] = root_r * ai;
      }
    }
    if (this.verbose) {
      this.printState("-> beamsplitter_aux result ");
    }
  };
  this.postselect = function(targetQubits, value) {
    for (var state_index = 0;state_index < this.num_states;++state_index) {
      var state = this.states[state_index];
      var desired = value ? true : false;
      var actual = state.logical_value_bf.andIsNotEqualZero(targetQubits);
      if (desired != actual) {
        this.state_data[state_index * 2] = 0;
        this.state_data[state_index * 2 + 1] = 0;
      }
    }
    if (this.verbose) {
      this.printState("-> postselect result ");
    }
  };
  this.postselect_qubit_pair = function(targetQubits) {
    var bit0 = getLowestBitIndex(targetQubits);
    var bit1 = getHighestBitIndex(targetQubits);
    for (var state_index = 0;state_index < this.num_states;++state_index) {
      var state = this.states[state_index];
      if (state.logical_value_bf.getBit(bit0) == state.logical_value_bf.getBit(bit1)) {
        this.state_data[state_index * 2] = 0;
        this.state_data[state_index * 2 + 1] = 0;
      }
    }
    if (this.verbose) {
      this.printState("-> postselect_qubit_pair result ");
    }
  };
  this.exchange = function(targetQubits) {
    console.log(this.state_data);
    var bit0 = getLowestBitIndex(targetQubits);
    var bit1 = getHighestBitIndex(targetQubits);
    for (var state_index0 = 0;state_index0 < this.num_states;++state_index0) {
      var state0 = this.states[state_index0];
      for (var state_index1 = state_index0 + 1;state_index1 < this.num_states;++state_index1) {
        var state1 = this.states[state_index1];
        var is_buddy = false;
        if (state0.mode_to_photon_count[bit0] == state1.mode_to_photon_count[bit1] && state0.mode_to_photon_count[bit1] == state1.mode_to_photon_count[bit0]) {
          is_buddy = true;
          for (var mode_index = 0;mode_index < this.qReg.numQubits && is_buddy;++mode_index) {
            if (mode_index != bit0 && mode_index != bit1) {
              if (state0.mode_to_photon_count[mode_index] != state1.mode_to_photon_count[mode_index]) {
                is_buddy = false;
              }
            }
          }
        }
        if (is_buddy) {
          console.log("  swap buddies " + state0.mode_str() + " <-> " + state1.mode_str());
          var tr = this.state_data[state_index0 * 2];
          var ti = this.state_data[state_index0 * 2 + 1];
          this.state_data[state_index0 * 2] = this.state_data[state_index1 * 2];
          this.state_data[state_index0 * 2 + 1] = this.state_data[state_index1 * 2 + 1];
          this.state_data[state_index1 * 2] = tr;
          this.state_data[state_index1 * 2 + 1] = ti;
          break;
        }
      }
    }
    if (this.verbose) {
      this.printState("-> exchange result ");
    }
    console.log(this.state_data);
  };
  this.pair_source = function(targetQubits) {
    console.log(this.state_data);
    var bit0 = getLowestBitIndex(targetQubits);
    var bit1 = getHighestBitIndex(targetQubits);
    for (var state_index0 = 0;state_index0 < this.num_states;++state_index0) {
      var state0 = this.states[state_index0];
      for (var state_index1 = state_index0 + 1;state_index1 < this.num_states;++state_index1) {
        var state1 = this.states[state_index1];
        var is_buddy = false;
        if (state0.mode_to_photon_count[bit0] == 2 && state0.mode_to_photon_count[bit1] == 0 && state0.mode_to_photon_count[bit0] == 1 && state0.mode_to_photon_count[bit1] == 1) {
          is_buddy = true;
          for (var mode_index = 0;mode_index < this.qReg.numQubits && is_buddy;++mode_index) {
            if (mode_index != bit0 && mode_index != bit1) {
              if (state0.mode_to_photon_count[mode_index] != state1.mode_to_photon_count[mode_index]) {
                is_buddy = false;
              }
            }
          }
        }
        if (is_buddy) {
          console.log("  pair_source buddies " + state0.mode_str() + " <-> " + state1.mode_str());
          var tr = this.state_data[state_index0 * 2];
          var ti = this.state_data[state_index0 * 2 + 1];
          this.state_data[state_index0 * 2] = 0;
          this.state_data[state_index0 * 2 + 1] = 0;
          this.state_data[state_index1 * 2] = tr;
          this.state_data[state_index1 * 2 + 1] = ti;
          break;
        }
      }
    }
    if (this.verbose) {
      this.printState("-> pair_source result ");
    }
    console.log(this.state_data);
  };
  this.phase = function(targetQubits, theta_degrees) {
    console.log(this.state_data);
    var theta_radians = Math.PI * theta_degrees / 180;
    var sval = Math.sin(theta_radians);
    var cval = Math.cos(theta_radians);
    for (var state_index = 0;state_index < this.num_states;++state_index) {
      var state = this.states[state_index];
      if (state.logical_value_bf.andIsNotEqualZero(targetQubits)) {
        var ar = this.state_data[state_index * 2];
        var ai = this.state_data[state_index * 2 + 1];
        this.state_data[state_index * 2] = cval * ar + sval * ai;
        this.state_data[state_index * 2 + 1] = cval * ai - sval * ar;
      }
    }
    if (this.verbose) {
      this.printState("-> phase shift result ");
    }
  };
}
function convertToBeamSplitters(staff) {
  if (!qReg.position_encoded) {
    return;
  }
  staff.convertToBeamSplitters();
}
function convertToPositionEncoding(staff) {
  var qReg = staff.qReg;
  if (qReg.position_encoded) {
    return;
  }
  qReg.position_encoded = true;
  var old_instructions = new Array;
  var old_numQubits = qReg.numQubits;
  for (var instIndex = 0;instIndex < staff.instructions.length;++instIndex) {
    old_instructions.push(staff.instructions[instIndex]);
  }
  this.qReg.deactivate();
  this.qReg.setSize(old_numQubits * 2, qReg.numBlockQubits, qReg.doublePrecision);
  this.qReg.activate();
  this.qReg.staff.clear();
  for (var instIndex = 0;instIndex < old_instructions.length;++instIndex) {
    var old_inst = old_instructions[instIndex];
    var old_op = old_inst.op;
    var new_op = old_op;
    var old_cond = old_inst.conditionQubits;
    var new_cond = new BitField(0, qReg.numQubits);
    var new_aux = new BitField(0, qReg.numQubits);
    var temp_cond = new BitField(0, qReg.numQubits);
    var low_cond = old_cond.getLowestBitIndex();
    var high_cond = old_cond.getHighestBitIndex();
    for (var bit = low_cond;bit <= high_cond;++bit) {
      if (old_cond.getBit(bit)) {
        new_cond.setBit(bit << 1, 1);
      }
    }
    var old_targ = old_inst.targetQubits;
    var new_targ = new BitField(0, qReg.numQubits);
    var new_cond2 = new BitField(0, qReg.numQubits);
    var new_targ2 = new BitField(0, qReg.numQubits);
    var new_write_val = new BitField(0, qReg.numQubits);
    var low_targ = old_targ.getLowestBitIndex();
    var high_targ = old_targ.getHighestBitIndex();
    if (old_op == "not" || old_op == "cnot" || old_op == "rootnot" || old_op == "crootnot" || old_op == "rootnot_inv" || old_op == "crootnot_inv") {
      new_op = "exchange";
      if (old_op == "rootnot" || old_op == "crootnot") {
        new_op = "rootexchange";
      } else {
        if (old_op == "rootnot_inv" || old_op == "crootnot_inv") {
          new_op = "rootexchange_inv";
        }
      }
      for (var bit = low_targ;bit <= high_targ;++bit) {
        new_targ.set(0);
        if (old_targ.getBit(bit)) {
          new_targ.setBit(bit << 1, 1);
          new_targ.setBit((bit << 1) + 1, 1);
          var new_inst = staff.insertInstruction(staff.instructions.length, new QInstruction(new_op, new_targ, new_cond, old_inst.theta, old_inst.codeLabel));
          if (low_cond >= 0) {
            new_inst.auxQubits = new BitField(0, qReg.numQubits);
            for (var c = 0;c < qReg.numQubits;++c) {
              if (new_cond.getBit(c)) {
                var aux = c ^ 1;
                new_inst.auxQubits.setBit(aux, 1);
              }
            }
          }
        }
      }
    } else {
      if (old_op == "phase") {
        new_op = "phase";
        if (low_cond == high_cond) {
          new_cond.set(0);
          new_cond.setBit((low_cond << 1) + 1, 1);
          var new_inst = staff.insertInstruction(staff.instructions.length, new QInstruction(new_op, new_targ, new_cond, old_inst.theta, old_inst.codeLabel));
        } else {
          if (old_inst.theta == 180 && old_inst.conditionQubits.countOneBits() == 2) {
            new_targ.set(0);
            new_targ.setBit((high_cond << 1) + 0, 1);
            new_targ.setBit((low_cond << 1) + 1, 1);
            var new_inst = staff.insertInstruction(staff.instructions.length, new QInstruction("dual_rail_beamsplitter", new_targ, null, 1 / 3, old_inst.codeLabel));
            new_inst.auxQubits = new BitField(0, qReg.numQubits);
            new_inst.auxQubits.setBit((high_cond << 1) + 1, 1);
            new_inst.auxQubits.setBit((low_cond << 1) + 0, 1);
          } else {
            new_cond.set(0);
            for (var bit = low_cond;bit <= high_cond;++bit) {
              if (old_cond.getBit(bit)) {
                new_cond.setBit((bit << 1) + 1, 1);
              }
            }
            var new_inst = staff.insertInstruction(staff.instructions.length, new QInstruction(new_op, 0, new_cond, old_inst.theta, old_inst.codeLabel));
          }
        }
      } else {
        if (old_op == "exchange" || old_op == "cexchange" || old_op == "rootexchange" || old_op == "rootexchange_inv") {
          new_op = old_op;
          low_targ <<= 1;
          high_targ <<= 1;
          new_targ.set(0);
          new_targ.setBit(low_targ, 1);
          new_targ.setBit(high_targ, 1);
          staff.insertInstruction(staff.instructions.length, new QInstruction(new_op, new_targ, new_cond, old_inst.theta, old_inst.codeLabel));
          new_targ.set(0);
          new_targ.setBit(low_targ + 1, 1);
          new_targ.setBit(high_targ + 1, 1);
          staff.insertInstruction(staff.instructions.length, new QInstruction(new_op, new_targ, new_cond, old_inst.theta, old_inst.codeLabel));
        } else {
          if (old_op == "hadamard") {
            new_targ.set(0);
            new_targ2.set(0);
            new_targ2.setBit(low_targ << 1, 1);
            new_targ.setBit(low_targ << 1, 1);
            new_targ.setBit((low_targ << 1) + 1, 1);
            staff.insertInstruction(staff.instructions.length, new QInstruction("dual_rail_beamsplitter", new_targ, new_cond, .5, old_inst.codeLabel));
            staff.insertInstruction(staff.instructions.length, new QInstruction("phase", 0, new_targ2, 90, old_inst.codeLabel));
            staff.insertInstruction(staff.instructions.length, new QInstruction("dual_rail_beamsplitter", new_targ, new_cond, .5, old_inst.codeLabel));
          } else {
            if (old_op == "optical_beamsplitter") {
              new_targ.set(0);
              new_op = "dual_rail_beamsplitter";
              for (var bit = low_targ;bit <= high_targ;++bit) {
                if (old_targ.getBit(bit)) {
                  new_targ.setBit(bit << 1, 1);
                  new_targ.setBit((bit << 1) + 1, 1);
                }
              }
              staff.insertInstruction(staff.instructions.length, new QInstruction(new_op, new_targ, new_cond, old_inst.theta, old_inst.codeLabel));
            } else {
              if (old_op == "start_photon_sim" || old_op == "stop_photon_sim") {
                new_targ.set(0);
                for (var bit = low_targ;bit <= high_targ;++bit) {
                  if (old_targ.getBit(bit)) {
                    new_targ.setBit(bit << 1, 1);
                    new_targ.setBit((bit << 1) + 1, 1);
                  }
                }
                staff.insertInstruction(staff.instructions.length, new QInstruction(old_op, new_targ, new_cond, old_inst.theta, old_inst.codeLabel));
              } else {
                if (old_op == "pair_source" || old_op == "discard") {
                  new_targ.set(0);
                  new_cond.set(0);
                  for (var bit = low_targ;bit <= high_targ;++bit) {
                    if (old_targ.getBit(bit)) {
                      new_targ.setBit(bit << 1, 1);
                      new_targ.setBit((bit << 1) + 1, 1);
                    }
                  }
                  for (var bit = low_cond;bit <= high_cond;++bit) {
                    if (old_cond.getBit(bit)) {
                      new_cond.setBit(bit << 1, 1);
                      new_cond.setBit((bit << 1) + 1, 1);
                    }
                  }
                  staff.insertInstruction(staff.instructions.length, new QInstruction(old_op, new_targ, new_cond, old_inst.theta, old_inst.codeLabel));
                } else {
                  if (old_op == "read") {
                    new_targ.set(0);
                    for (var bit = low_targ;bit <= high_targ;++bit) {
                      if (old_targ.getBit(bit)) {
                        new_targ.setBit(bit << 1, 1);
                      }
                    }
                    staff.insertInstruction(staff.instructions.length, new QInstruction(old_op, new_targ, new_cond, old_inst.theta, old_inst.codeLabel));
                  } else {
                    if (old_op == "write") {
                      var old_write_val = intToBitField(old_inst.writeValue);
                      new_targ.set(0);
                      new_write_val.set(0);
                      for (var bit = low_targ;bit <= high_targ;++bit) {
                        if (old_targ.getBit(bit)) {
                          if (val) {
                            new_targ.setBit(bit << 1, 1);
                          }
                          if (!val) {
                            new_targ.setBit((bit << 1) + 1, 1);
                          }
                          var val = old_write_val.getBit(bit);
                          new_write_val.setBit(bit << 1, val);
                          new_write_val.setBit((bit << 1) + 1, !val);
                        }
                      }
                      staff.insertInstruction(staff.instructions.length, new QInstruction(old_op, new_targ, new_write_val, old_inst.theta, old_inst.codeLabel));
                    } else {
                      new_targ.set(0);
                      for (var bit = low_targ;bit <= high_targ;++bit) {
                        if (old_targ.getBit(bit)) {
                          new_targ.set(0);
                          new_targ.setBit(bit << 1, 1);
                          new_cond2.set(0);
                          new_cond2.setBit(bit << 1, 1);
                          new_targ2.set(0);
                          new_targ2.setBit((bit << 1) + 1, 1);
                          staff.insertInstruction(staff.instructions.length, new QInstruction("cnot", new_targ2, new_cond2, 0, old_inst.codeLabel));
                          temp_cond.set(new_cond);
                          temp_cond.setBit((bit << 1) + 1, 1);
                          staff.insertInstruction(staff.instructions.length, new QInstruction(old_op, new_targ, temp_cond, old_inst.theta, old_inst.codeLabel));
                          new_cond2.set(0);
                          new_cond2.setBit(bit << 1, 1);
                          new_targ2.set(0);
                          new_targ2.setBit((bit << 1) + 1, 1);
                          staff.insertInstruction(staff.instructions.length, new QInstruction("cnot", new_targ2, new_cond2, 0, old_inst.codeLabel));
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  staff.cancelRedundantOperations();
  this.qReg.changed();
}
function dipStroke(x1, x2, y1, y2, ctx) {
  var x1a = x1 + .4 * (x2 - x1);
  var x2a = x1 + .6 * (x2 - x1);
  var x1m = .5 * (x1 + x1a);
  var x2m = .5 * (x2 + x2a);
  var ym = .5 * (y1 + y2);
  ctx.moveTo(x1, y1);
  ctx.quadraticCurveTo(x1m, y1, x1m, ym);
  ctx.quadraticCurveTo(x1m, y2, x1a, y2);
  ctx.lineTo(x2a, y2);
  ctx.quadraticCurveTo(x2m, y2, x2m, ym);
  ctx.quadraticCurveTo(x2m, y1, x2, y1);
}
function drawPhotonicInstructions(staff, ctx) {
  var qReg = staff.qReg;
  if (!qReg.position_encoded) {
    return;
  }
  ctx.save();
  var gx = staff.gridSize * staff.photonic_stretch;
  var gy = staff.gridSize;
  var dark_grad = ctx.createLinearGradient(-.5 * gx, 0, .5 * gx, 0);
  dark_grad.addColorStop(0, ctx.strokeStyle);
  dark_grad.addColorStop(.5, "black");
  dark_grad.addColorStop(1, ctx.strokeStyle);
  var dip_grad = ctx.createLinearGradient(0, 0, 0, .5 * gy);
  dip_grad.addColorStop(0, "#999");
  dip_grad.addColorStop(.5, "#999");
  dip_grad.addColorStop(1, ctx.strokeStyle);
  var dip_grad2 = ctx.createLinearGradient(0, .5 * gy, 0, 0);
  dip_grad.addColorStop(0, "#999");
  dip_grad.addColorStop(.5, "#999");
  dip_grad.addColorStop(1, ctx.strokeStyle);
  var dark_grad3 = ctx.createLinearGradient(-.5 * gx, 0, .5 * gx, 0);
  dark_grad3.addColorStop(0, "#999");
  dark_grad3.addColorStop(.3, "#999");
  dark_grad3.addColorStop(.4, ctx.strokeStyle);
  dark_grad3.addColorStop(.6, ctx.strokeStyle);
  dark_grad3.addColorStop(.7, "#999");
  dark_grad3.addColorStop(1, "#999");
  var rows = new BitField(qReg.numQubits);
  if (staff.instructions_parallel) {
    num_slots = staff.instructions_parallel.length;
    for (var slot = 0;slot < num_slots;++slot) {
      var islot = staff.instructions_parallel[slot];
      rows.set(0);
      for (var i = 0;i < islot.length;++i) {
        rows.orEquals(islot[i].targetQubits);
        rows.orEquals(islot[i].conditionQubits);
        rows.orEquals(islot[i].auxQubits);
      }
      for (var bit = 0;bit < qReg.numQubits;++bit) {
        if (!rows.getBit(bit)) {
          ctx.beginPath();
          ctx.moveTo(gx * (slot - .51), gy * bit);
          ctx.lineTo(gx * (slot + .51), gy * bit);
          ctx.stroke();
        }
      }
    }
  } else {
    var num_slots = staff.instructions.length;
    for (var slot = 0;slot < num_slots;++slot) {
      rows.set(0);
      rows.orEquals(staff.instructions[slot].targetQubits);
      rows.orEquals(staff.instructions[slot].conditionQubits);
      rows.orEquals(staff.instructions[slot].auxQubits);
      for (var bit = 0;bit < qReg.numQubits;++bit) {
        if (!rows.getBit(bit)) {
          ctx.beginPath();
          ctx.moveTo(gx * (slot - .51), gy * bit);
          ctx.lineTo(gx * (slot + .51), gy * bit);
          ctx.stroke();
        }
      }
    }
  }
  for (var inst = 0;inst < staff.instructions.length;++inst) {
    ctx.save();
    var curr = staff.instructions[inst];
    if (curr.parallel_slot != null) {
      var x = gx * curr.parallel_slot;
      ctx.translate(x, 0);
    } else {
      ctx.translate(gx * inst, 0);
    }
    var high_targ = curr.targetQubits.getHighestBitIndex();
    var low_targ = curr.targetQubits.getLowestBitIndex();
    var high_cond = curr.conditionQubits.getHighestBitIndex();
    var low_cond = curr.conditionQubits.getLowestBitIndex();
    var high = Math.max(high_targ, high_cond);
    var low = Math.min(low_targ, low_cond);
    var ok = false;
    if (curr.op == "write") {
      ok = true;
      ctx.beginPath();
      for (var bit = low;bit <= high;bit += 2) {
        if (curr.targetQubits.getBit(bit)) {
          var x1 = -.1 * gx;
          var y1 = (bit - 1) * gy;
          var x2 = .5 * gx;
          var y2 = (bit + 0) * gy;
          var dip_depth = .4 * gy;
          var gap = .1 * gy;
          var xa = x1 + .1 * (x2 - x1);
          var xb = x1 + .4 * (x2 - x1);
          var xe = x1 + .6 * (x2 - x1);
          var xf = x1 + .9 * (x2 - x1);
          var xm = .5 * (x1 + x2);
          var ym = .5 * (y1 + y2);
          dipStroke(xa, xb, y1, y1 + dip_depth, ctx);
          dipStroke(xa, xb, y2, y2 - dip_depth, ctx);
          dipStroke(xe, xf, y1, y1 + dip_depth, ctx);
          dipStroke(xe, xf, y2, y2 - dip_depth, ctx);
          ctx.moveTo(x1, y1);
          ctx.lineTo(xa, y1);
          ctx.moveTo(xb, y1);
          ctx.lineTo(xe, y1);
          ctx.moveTo(xf, y1);
          ctx.lineTo(x2, y1);
          ctx.moveTo(x1, y2);
          ctx.lineTo(xa, y2);
          ctx.moveTo(xb, y2);
          ctx.lineTo(xe, y2);
          ctx.moveTo(xf, y2);
          ctx.lineTo(x2, y2);
          ctx.moveTo(x1, y3);
          ctx.lineTo(xc, y3);
          ctx.moveTo(xd, y3);
          ctx.lineTo(x2, y3);
          var xr1 = x1 + .3 * (x2 - x1);
          var xr2 = x1 + .6 * (x2 - x1);
          var xrm = .5 * (xr1 + xr2);
          var yr1 = gap;
          var yr2 = gap * 3;
          var yrm = .5 * (yr1 + yr2);
          ctx.moveTo(xrm, y1 - yr1);
          ctx.quadraticCurveTo(xr1, y1 - yrm, xrm, y1 - yr2);
          ctx.quadraticCurveTo(xr2, y1 - yrm, xrm, y1 - yr1);
          ctx.moveTo(xrm, y2 + yr1);
          ctx.quadraticCurveTo(xr1, y2 + yrm, xrm, y2 + yr2);
          ctx.quadraticCurveTo(xr2, y2 + yrm, xrm, y2 + yr1);
        }
      }
      ctx.stroke();
    } else {
      if (curr.op == "dual_rail_beamsplitter" || curr.op == "exchange" || curr.op == "cexchange" || curr.op == "rootexchange" || curr.op == "rootexchange_inv") {
        if (high_targ == low_targ + 1) {
          if (curr.op == "exchange" && low_cond < 0) {
            ok = true;
            var x1 = -.5 * gx;
            var y1 = low_targ * gy;
            var x2 = .5 * gx;
            var y2 = high_targ * gy;
            var xm = .5 * (x1 + x2);
            var ym = .5 * (y1 + y2);
            ctx.save();
            ctx.strokeStyle = dark_grad;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.quadraticCurveTo(.5 * (x1 + xm), y1, xm, ym);
            ctx.quadraticCurveTo(.5 * (x2 + xm), y2, x2, y2);
            ctx.stroke();
            ctx.restore();
            ctx.beginPath();
            ctx.moveTo(x1, y2);
            ctx.quadraticCurveTo(.5 * (x1 + xm), y2, xm, ym);
            ctx.quadraticCurveTo(.5 * (x2 + xm), y1, x2, y1);
            ctx.stroke();
          } else {
            if (curr.op == "dual_rail_beamsplitter") {
              ok = true;
              var x1 = -.5 * gx;
              var y1 = low_targ * gy;
              var x2 = .5 * gx;
              var y2 = high_targ * gy;
              var y3 = low_cond * gy;
              var dip_depth = .4 * gy;
              var gap = .1 * gy;
              var xa = x1 + .1 * (x2 - x1);
              var xb = x1 + .3 * (x2 - x1);
              var xc = x1 + .3 * (x2 - x1);
              var xd = x1 + .7 * (x2 - x1);
              var xe = x1 + .7 * (x2 - x1);
              var xf = x1 + .9 * (x2 - x1);
              var xm = .5 * (x1 + x2);
              var ym = .5 * (y1 + y2);
              ctx.beginPath();
              dipStroke(x1, x2, y1, y1 + dip_depth, ctx);
              ctx.moveTo(x1, y2);
              dipStroke(x1, x2, y2, y2 - dip_depth, ctx);
              ctx.stroke();
            } else {
              if (low_cond == high_cond) {
                if (low_cond == low_targ - 1 || low_cond == high_targ + 1) {
                  ok = true;
                  var x1 = -.5 * gx;
                  var y1 = low_targ * gy;
                  var x2 = .5 * gx;
                  var y2 = high_targ * gy;
                  var y3 = low_cond * gy;
                  var dip_depth = .4 * gy;
                  var gap = .1 * gy;
                  var xa = x1 + .1 * (x2 - x1);
                  var xb = x1 + .3 * (x2 - x1);
                  var xc = x1 + .3 * (x2 - x1);
                  var xd = x1 + .7 * (x2 - x1);
                  var xe = x1 + .7 * (x2 - x1);
                  var xf = x1 + .9 * (x2 - x1);
                  var xm = .5 * (x1 + x2);
                  var ym = .5 * (y1 + y2);
                  ctx.beginPath();
                  dipStroke(xa, xb, y1, y1 + dip_depth, ctx);
                  dipStroke(xa, xb, y2, y2 - dip_depth, ctx);
                  dipStroke(xc, xd, y1, y1 - dip_depth, ctx);
                  if (low_cond < low_targ) {
                    dipStroke(xc, xd, y1 - gy, y1 - gy + dip_depth, ctx);
                  }
                  dipStroke(xc, xd, y2, y2 + dip_depth, ctx);
                  if (low_cond > low_targ) {
                    dipStroke(xc, xd, y2 + gy, y2 + gy - dip_depth, ctx);
                  }
                  dipStroke(xe, xf, y1, y1 + dip_depth, ctx);
                  dipStroke(xe, xf, y2, y2 - dip_depth, ctx);
                  ctx.moveTo(x1, y1);
                  ctx.lineTo(xa, y1);
                  ctx.moveTo(xb, y1);
                  ctx.lineTo(xc, y1);
                  ctx.moveTo(xd, y1);
                  ctx.lineTo(xe, y1);
                  ctx.moveTo(xf, y1);
                  ctx.lineTo(x2, y1);
                  ctx.moveTo(x1, y2);
                  ctx.lineTo(xa, y2);
                  ctx.moveTo(xb, y2);
                  ctx.lineTo(xc, y2);
                  ctx.moveTo(xd, y2);
                  ctx.lineTo(xe, y2);
                  ctx.moveTo(xf, y2);
                  ctx.lineTo(x2, y2);
                  ctx.moveTo(x1, y3);
                  ctx.lineTo(xc, y3);
                  ctx.moveTo(xd, y3);
                  ctx.lineTo(x2, y3);
                  ctx.stroke();
                  ctx.save();
                  if (low_cond > low_targ) {
                    ctx.strokeStyle = dark_grad3;
                    ctx.beginPath();
                    dipStroke(xc, xd, y1 - dip_depth - 2 * gap - dip_depth / 8, y1 - dip_depth - 2 * gap, ctx);
                    ctx.stroke();
                  } else {
                    ctx.strokeStyle = dark_grad3;
                    ctx.beginPath();
                    dipStroke(xc, xd, y2 + dip_depth + 2 * gap + dip_depth / 8, y2 + dip_depth + 2 * gap, ctx);
                    ctx.stroke();
                  }
                  ctx.restore();
                  if (curr.auxQubits) {
                    var low_aux = curr.auxQubits.getLowestBitIndex();
                    if (low_aux >= 0) {
                      var yaux = low_aux * gy;
                      if (low_aux > low_targ) {
                        ctx.beginPath();
                        dipStroke(xc, xd, yaux, yaux + dip_depth, ctx);
                        ctx.stroke();
                        ctx.save();
                        ctx.strokeStyle = dark_grad3;
                        ctx.beginPath();
                        dipStroke(xc, xd, yaux + dip_depth + 2 * gap + dip_depth / 8, yaux + dip_depth + 2 * gap, ctx);
                        ctx.stroke();
                        ctx.restore();
                      } else {
                        ctx.beginPath();
                        dipStroke(xc, xd, yaux, yaux - dip_depth, ctx);
                        ctx.stroke();
                        ctx.save();
                        ctx.strokeStyle = dark_grad3;
                        ctx.beginPath();
                        dipStroke(xc, xd, yaux - dip_depth - 2 * gap - dip_depth / 8, yaux - dip_depth - 2 * gap, ctx);
                        ctx.stroke();
                        ctx.restore();
                      }
                      ctx.beginPath();
                      ctx.moveTo(x1, yaux);
                      ctx.lineTo(xc, yaux);
                      ctx.moveTo(xd, yaux);
                      ctx.lineTo(x2, yaux);
                      ctx.stroke();
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    if (!ok) {
      ctx.save();
      ctx.fillStyle = "red";
      ctx.strokeStyle = "red";
      ctx.globalAlpha = .5;
      ctx.lineWidth = 8;
      if (high_cond >= 0) {
        fillCircle(ctx, 0, gy * high_cond, gy * .5);
        fillCircle(ctx, 0, gy * low_cond, gy * .5);
      }
      if (high_targ >= 0) {
        strokeCircle(ctx, 0, gy * high_targ, gy * .5);
        strokeCircle(ctx, 0, gy * low_targ, gy * .5);
      }
      ctx.restore();
    }
    ctx.restore();
  }
  ctx.restore();
}
;function QTest() {
  this.resultsOK = true;
  this.runAllTests = function() {
    this.print("Runnnig all tests...");
    this.resultsOK = true;
    this.testNot(1, 1, 0);
    this.testNot(8, 8, 0);
    this.testNot(8, 4, 0);
    this.testCNot(1, 1, 21845);
    this.testCNot(8, 8, 21845);
    this.testCNot(8, 4, 21845);
    this.testHadamard(1, 1, 0);
    this.testHadamard(8, 8, 0);
    this.testHadamard(8, 4, 0);
    this.testCHadamard(1, 1, 21845);
    this.testCHadamard(8, 8, 21845);
    this.testCHadamard(8, 4, 21845);
    this.testPhaseShift(1, 1, 0);
    this.testPhaseShift(8, 8, 0);
    this.testPhaseShift(8, 4, 0);
    if (this.resultsOK) {
      this.print("...passed.");
    } else {
      this.print("...FAILED.");
    }
  };
  this.print = function(str) {
  };
  this.error = function(str) {
    this.resultsOK = false;
  };
  this.testNot = function(numQubits, blockQubits, initialValue) {
    this.print("Testing Not... " + numQubits + "/" + blockQubits);
    var doublePrecision = false;
    var qReg = new QReg(numQubits, blockQubits, doublePrecision);
    qReg.activate();
    var tracker = initialValue & qReg.allBitsMask;
    qReg.writeAll(tracker);
    if (qReg.readAll() != tracker) {
      this.error("  : write and read don't match: (" + qReg.readAll() + " != " + tracker + ")");
    }
    for (var i = 0;i < numQubits;++i) {
      var target = 1 << i;
      qReg.not(target);
      tracker ^= target;
      if (qReg.readAll() != tracker) {
        this.error("  error in bit " + i + " (" + qReg.readAll() + " != " + tracker + ")");
      }
    }
  };
  this.testCNot = function(numQubits, blockQubits, initialValue) {
    this.print("Testing CNot... " + numQubits + "/" + blockQubits);
    var doublePrecision = false;
    var qReg = new QReg(numQubits, blockQubits, doublePrecision);
    qReg.activate();
    var tracker = initialValue & qReg.allBitsMask;
    qReg.writeAll(tracker);
    if (qReg.readAll() != tracker) {
      this.error("  : write and read don't match: (" + qReg.readAll() + " != " + tracker + ")");
    }
    for (var i = 0;i < numQubits;++i) {
      for (var j = 0;j < 1 << numQubits - 1;++j) {
        var target = 1 << i;
        var cond = j >> i << i + 1 | j & target - 1;
        cond &= qReg.allBitsMask;
        var prevTracker = tracker;
        var prevReg = qReg.readAll();
        qReg.cnot(target, cond);
        if ((tracker & cond) == cond) {
          tracker ^= target;
        }
        var cresult = qReg.readAll();
        qReg.invalidateAllClassicalBits();
        var qresult = qReg.readAll();
        if (qresult != cresult || cresult != tracker) {
          this.error("  error in bit " + i + " of " + numQubits + "/" + blockQubits + " prevTracker:" + prevTracker + " prevReg:" + prevReg + " target:" + target + " cond:" + cond + " ( quantum:" + qresult + " class:" + cresult + " trk:" + tracker + ")");
        }
      }
    }
  };
  this.testHadamard = function(numQubits, blockQubits, initialValue) {
    this.print("Testing Hadamard... " + numQubits + "/" + blockQubits);
    var ok = true;
    var doublePrecision = false;
    var qReg = new QReg(numQubits, blockQubits, doublePrecision);
    qReg.activate();
    var tracker = initialValue & qReg.allBitsMask;
    qReg.writeAll(tracker);
    if (qReg.readAll() != tracker) {
      this.error("  : write and read don't match: (" + qReg.readAll() + " != " + tracker + ")");
    }
    qReg.hadamard(1);
  };
  this.testCHadamard = function(numQubits, blockQubits, initialValue) {
    this.print("Testing CHadamard... " + numQubits + "/" + blockQubits);
    var ok = true;
    var doublePrecision = false;
    var qReg = new QReg(numQubits, blockQubits, doublePrecision);
    qReg.activate();
    var tracker = initialValue & qReg.allBitsMask;
    qReg.writeAll(tracker);
    if (qReg.readAll() != tracker) {
      this.error("  : write and read don't match: (" + qReg.readAll() + " != " + tracker + ")");
    }
    qReg.chadamard(1, 2);
  };
  this.testPhaseShift = function(numQubits, blockQubits, initialValue) {
    this.print("Testing Phase Shift... " + numQubits + "/" + blockQubits);
    var ok = true;
    var doublePrecision = false;
    var qReg = new QReg(numQubits, blockQubits, doublePrecision);
    qReg.activate();
    var tracker = initialValue & qReg.allBitsMask;
    qReg.writeAll(tracker);
    if (qReg.readAll() != tracker) {
      this.error("  : write and read don't match: (" + qReg.readAll() + " != " + tracker + ")");
    }
    qReg.phaseShift(1);
  };
}
function runRegressionTest() {
  var test = new QTest;
  test.runAllTests();
}
runRegressionTest();
var shader_vs = "  attribute vec2 aPos;" + "  attribute vec2 aTexCoord;" + "  varying   vec2 tc;" + "void main(void) {" + "   gl_Position = vec4(aPos, 0., 1.);" + "   tc = aTexCoord;" + "}";
var shader_fs_qc_show = "precision highp float;" + "  uniform sampler2D samp;" + "  varying vec2 tc;" + "void main(void) {" + "   vec4 pix = texture2D(samp, tc);" + "   float mag0 = pix.r * pix.r + pix.g * pix.g;" + "   float mag1 = pix.b * pix.b + pix.a * pix.a;" + "   gl_FragColor = vec4(mag0, mag1, 0, 1);" + "}";
var shader_fs_qc_debugfill_single = "precision highp float;" + "  uniform float height;" + "  uniform float width;" + "  varying vec2 tc;" + "void main(void) {" + "     vec4 val = vec4(floor(tc.x * width) * 4.0);" + "     val += vec4(0.0, 1.0, 2.0, 3.0);" + "     val += vec4(floor(tc.y * height) * width * 4.0);" + "     gl_FragData[0] = val;" + "}";
var shader_fs_qc_condmask1 = "precision highp float;" + "  uniform float zeroVal;" + "  uniform float oneVal;" + "  varying vec2 tc;" + "void main(void) {" + "     gl_FragData[0] = vec4(zeroVal, zeroVal, oneVal, oneVal);" + "}";
var shader_fs_qc_condmask = "precision highp float;" + "  uniform float xspan;" + "  uniform float yspan;" + "  uniform float inv_xspan;" + "  uniform float inv_yspan;" + "  uniform float zeroVal;" + "  uniform float oneVal;" + "  varying vec2 tc;" + "void main(void) {" + "     vec2 span = vec2(xspan, yspan);" + "     vec2 inv_span = vec2(inv_xspan, inv_yspan);" + "     vec2 a = floor(tc * span);" + "     vec2 c = floor(a * 0.5) * 2.0;" + "     vec2 odd_even = (a - c);" + "     float match = (odd_even.x + odd_even.y);" + 
"     float result = mix(zeroVal, oneVal, match);" + "     if (result > 0.5)" + "         discard;" + "     gl_FragData[0] = vec4(0.0);" + "}";
var shader_fs_qc_clear_single = "precision highp float;" + "  uniform float row_scale;" + "  uniform float column_scale;" + "  uniform float value_at_zero;" + "  varying vec2 tc;" + "void main(void) {" + "     highp int col = int(floor(tc.x * column_scale));" + "     highp int row = int(floor(tc.y * row_scale));" + "     if ((row + col) != 0)" + "       gl_FragData[0] = vec4(0., 0., 0., 0.);" + "     else" + "       gl_FragData[0] = vec4(value_at_zero, 0., 0., 0.);" + "}";
var shader_fs_qc_clear_dual = "#extension GL_EXT_draw_buffers : require\n" + "precision highp float;" + "  uniform float row_scale;" + "  uniform float column_scale;" + "  uniform float value_at_zero;" + "  varying vec2 tc;" + "void main(void) {" + "     highp int col = int(floor(tc.x * column_scale));" + "     highp int row = int(floor(tc.y * row_scale));" + "     if ((row + col) != 0)" + "       gl_FragData[0] = vec4(0., 0., 0., 0.);" + "     else" + "       gl_FragData[0] = vec4(value_at_zero, 0., 0., 0.);" + 
"     gl_FragData[1] = vec4(0., 0., 0., 0.);" + "}";
var shader_fs_qc_not_single = "precision highp float;" + "  uniform sampler2D src0;" + "  uniform float xspan;" + "  uniform float yspan;" + "  uniform float inv_xspan;" + "  uniform float inv_yspan;" + "  varying vec2 tc;" + "void main(void) {" + "     vec2 span = vec2(xspan, yspan);" + "     vec2 inv_span = vec2(inv_xspan, inv_yspan);" + "     vec2 a = floor(tc * span);" + "     vec2 c = floor(a * 0.5) * 2.0;" + "     vec2 odd_even = 2.0 * (a - c) - 1.0;" + "     vec2 pair = tc - odd_even * inv_span;" + 
"     vec4 pix0 = texture2D(src0, pair);" + "     gl_FragData[0] = pix0;" + "}";
var shader_fs_qc_cnot_single = "precision highp float;" + "  uniform sampler2D src0;" + "  uniform sampler2D condMask;" + "  uniform float xspan;" + "  uniform float yspan;" + "  uniform float inv_xspan;" + "  uniform float inv_yspan;" + "  varying vec2 tc;" + "void main(void) {" + "     vec2 span = vec2(xspan, yspan);" + "     vec2 inv_span = vec2(inv_xspan, inv_yspan);" + "     vec2 a = floor(tc * span);" + "     vec2 c = floor(a * 0.5) * 2.0;" + "     vec2 odd_even = 2.0 * (a - c) - 1.0;" + "     vec2 pair = tc - odd_even * inv_span;" + 
"     vec4 pix0 = texture2D(src0, tc);" + "     vec4 pix1 = texture2D(src0, pair);" + "     vec4 condPix0 = texture2D(condMask, tc);" + "     gl_FragData[0] = mix(pix0, pix1, condPix0);" + "}";
var shader_fs_qc_cnot_cross = "#extension GL_EXT_draw_buffers : require\n" + "precision highp float;" + "  uniform sampler2D src0;" + "  uniform sampler2D src1;" + "  uniform sampler2D condMask;" + "  varying vec2 tc;" + "void main(void) {" + "     vec4 pix0 = texture2D(src0, tc);" + "     vec4 pix1 = texture2D(src1, tc);" + "     vec4 condPix0 = texture2D(condMask, tc);" + "     gl_FragData[0] = mix(pix0, pix1, condPix0);" + "     gl_FragData[1] = mix(pix1, pix0, condPix0);" + "}";
var shader_fs_qc_phase = "precision highp float;" + "  uniform sampler2D src0;" + "  uniform sampler2D condMask;" + "  uniform float sval;" + "  uniform float cval;" + "  varying vec2 tc;" + "void main(void) {" + "     vec4 pix0 = texture2D(src0, tc);" + "     vec4 cscs = vec4(cval, -sval, cval, -sval);" + "     vec4 scsc = vec4(sval, cval, sval, cval);" + "     vec4 condPix0 = texture2D(condMask, tc);" + "     gl_FragData[0] = mix (pix0, pix0.xxzz * cscs + pix0.yyww * scsc, condPix0);" + "}";
var shader_fs_qc_2x2_single = "precision highp float;" + "  uniform sampler2D src0;" + "  uniform float xspan;" + "  uniform float yspan;" + "  uniform float inv_xspan;" + "  uniform float inv_yspan;" + "  uniform float m00r;" + "  uniform float m01r;" + "  uniform float m10r;" + "  uniform float m11r;" + "  uniform float m00i;" + "  uniform float m01i;" + "  uniform float m10i;" + "  uniform float m11i;" + "  varying vec2 tc;" + "void main(void) {" + "     vec4 mtxr = vec4(m00r, m01r, m10r, m11r);" + 
"     vec4 mtxi = vec4(m00i, m01i, m10i, m11i);" + "     vec4 signs = vec4(-1.0, 1.0, -1.0, 1.0);" + "     vec2 span = vec2(xspan, yspan);" + "     vec2 inv_span = vec2(inv_xspan, inv_yspan);" + "     vec2 a = floor(tc * span);" + "     vec2 c = floor(a * 0.5) * 2.0;" + "     vec2 odd_even = a - c;" + "     vec2 oe_plus_minus = 2.0 * odd_even - 1.0;" + "     vec2 pair = tc - oe_plus_minus * inv_span;" + "     vec4 pix0 = texture2D(src0, tc);" + "     vec4 pix1 = texture2D(src0, pair);" + "     vec4 outval0 = pix0 * mtxr.xxxx + signs * pix0.yxwz * mtxi.xxxx + " + 
"                    pix1 * mtxr.yyyy + signs * pix1.yxwz * mtxi.yyyy;" + "     vec4 outval1 = pix1 * mtxr.zzzz + signs * pix1.yxwz * mtxi.zzzz + " + "                    pix0 * mtxr.wwww + signs * pix0.yxwz * mtxi.wwww;" + "     gl_FragData[0] = mix(outval0, outval1, odd_even.x+odd_even.y);" + "}";
var shader_fs_qc_2x2_cross = "#extension GL_EXT_draw_buffers : require\n" + "precision highp float;" + "  uniform sampler2D src0;" + "  uniform sampler2D src1;" + "  uniform float m00r;" + "  uniform float m01r;" + "  uniform float m10r;" + "  uniform float m11r;" + "  uniform float m00i;" + "  uniform float m01i;" + "  uniform float m10i;" + "  uniform float m11i;" + "  varying vec2 tc;" + "void main(void) {" + "     vec4 mtxr = vec4(m00r, m01r, m10r, m11r);" + "     vec4 mtxi = vec4(m00i, m01i, m10i, m11i);" + 
"     vec4 signs = vec4(-1.0, 1.0, -1.0, 1.0);" + "     vec4 pix0 = texture2D(src0, tc);" + "     vec4 pix1 = texture2D(src1, tc);" + "     vec4 outval0 = pix0 * mtxr.xxxx + signs * pix0.yxwz * mtxi.xxxx + " + "                    pix1 * mtxr.yyyy + signs * pix1.yxwz * mtxi.yyyy;" + "     vec4 outval1 = pix0 * mtxr.zzzz + signs * pix0.yxwz * mtxi.zzzz + " + "                    pix1 * mtxr.wwww + signs * pix1.yxwz * mtxi.wwww;" + "     gl_FragData[0] = outval0;" + "     gl_FragData[1] = outval1;" + 
"}";
var shader_fs_qc_filterbit_single = "precision highp float;" + "  uniform sampler2D src0;" + "  uniform float xspan;" + "  uniform float yspan;" + "  uniform float inv_xspan;" + "  uniform float inv_yspan;" + "  varying vec2 tc;" + "void main(void) {" + "     vec2 span = vec2(xspan, yspan);" + "     vec2 inv_span = vec2(inv_xspan, inv_yspan);" + "     vec2 a = floor(tc * span);" + "     vec2 c = floor(a * 0.5) * 2.0;" + "     vec2 odd_even = a - c;" + "     vec4 pix0 = texture2D(src0, tc);" + "     pix0 *= pix0;" + 
"     float out_mag = pix0.x + pix0.y + pix0.z + pix0.w;" + "     gl_FragData[0] = mix(vec4(out_mag, 0.0, 0.0, 0.0), vec4(0.0, 0.0, 0.0, out_mag), odd_even.x + odd_even.y);" + "}";
var shader_fs_qc_add4x4_single = "precision highp float;" + "  uniform sampler2D src0;" + "  uniform float wfactor;" + "  uniform float hfactor;" + "  varying vec2 tc;" + "void main(void) {" + "     vec2 td = tc * vec2(wfactor, hfactor);" + "     vec4 pix0 = texture2D(src0, td);" + "     pix0     += texture2D(src0, vec2(td.x + wfactor,       td.y));" + "     pix0     += texture2D(src0, vec2(td.x + wfactor * 2.0, td.y));" + "     pix0     += texture2D(src0, vec2(td.x + wfactor * 3.0, td.y));" + "     pix0     += texture2D(src0, vec2(td.x,                 td.y + hfactor));" + 
"     pix0     += texture2D(src0, vec2(td.x + wfactor,       td.y + hfactor));" + "     pix0     += texture2D(src0, vec2(td.x + wfactor * 2.0, td.y + hfactor));" + "     pix0     += texture2D(src0, vec2(td.x + wfactor * 3.0, td.y + hfactor));" + "     pix0     += texture2D(src0, vec2(td.x,                 td.y + hfactor * 2.0));" + "     pix0     += texture2D(src0, vec2(td.x + wfactor,       td.y + hfactor * 2.0));" + "     pix0     += texture2D(src0, vec2(td.x + wfactor * 2.0, td.y + hfactor * 2.0));" + 
"     pix0     += texture2D(src0, vec2(td.x + wfactor * 3.0, td.y + hfactor * 2.0));" + "     pix0     += texture2D(src0, vec2(td.x,                 td.y + hfactor * 3.0));" + "     pix0     += texture2D(src0, vec2(td.x + wfactor,       td.y + hfactor * 3.0));" + "     pix0     += texture2D(src0, vec2(td.x + wfactor * 2.0, td.y + hfactor * 3.0));" + "     pix0     += texture2D(src0, vec2(td.x + wfactor * 3.0, td.y + hfactor * 3.0));" + "     gl_FragData[0] = pix0;" + "}";
var shader_fs_qc_setbit_single = "precision highp float;" + "  uniform sampler2D src0;" + "  uniform float xspan;" + "  uniform float yspan;" + "  uniform float inv_xspan;" + "  uniform float inv_yspan;" + "  uniform float value;" + "  varying vec2 tc;" + "void main(void) {" + "     vec2 span = vec2(xspan, yspan);" + "     vec2 inv_span = vec2(inv_xspan, inv_yspan);" + "     vec2 a = floor(tc * span);" + "     vec2 c = floor(a * 0.5) * 2.0;" + "     vec2 odd_even = (a - c);" + "     float match = (odd_even.x + odd_even.y);" + 
"     match = mix(1.0 - match, match, value);" + "     vec4 pix0 = texture2D(src0, tc);" + "     gl_FragData[0] = match * pix0;" + "}";
var shader_fs_qc_not1_single = "precision highp float;" + "  uniform sampler2D src0;" + "  varying vec2 tc;" + "void main(void) {" + "     vec4 pix0 = texture2D(src0, tc);" + "     gl_FragData[0] = pix0.barg;" + "}";
var shader_fs_qc_cnot1_single = "precision highp float;" + "  uniform sampler2D src0;" + "  uniform sampler2D condMask;" + "  varying vec2 tc;" + "void main(void) {" + "     vec4 pix0 = texture2D(src0, tc);" + "     vec4 cond0 = texture2D(condMask, tc);" + "     gl_FragData[0] = mix(pix0, pix0.barg, cond0);" + "}";
var shader_fs_qc_2x21_single = "precision highp float;" + "  uniform sampler2D src0;" + "  uniform float m00r;" + "  uniform float m01r;" + "  uniform float m10r;" + "  uniform float m11r;" + "  uniform float m00i;" + "  uniform float m01i;" + "  uniform float m10i;" + "  uniform float m11i;" + "  varying vec2 tc;" + "void main(void) {" + "     vec4 pix0 = texture2D(src0, tc);" + "     vec4 mtxr = vec4(m00r, m01r, m10r, m11r);" + "     vec4 mtxi0 = vec4(-m00i, m00i, -m10i, m10i);" + "     vec4 mtxi1 = vec4(-m01i, m01i, -m11i, m11i);" + 
"     vec4 outval = pix0 * mtxr.xxww + pix0.zwxy * mtxr.yyzz;" + "     outval += pix0.yxyx * mtxi0 + pix0.wzwz * mtxi1;" + "     gl_FragData[0] = outval;" + "}";
var shader_fs_qc_filterbit1_single = "precision highp float;" + "  uniform sampler2D src0;" + "  varying vec2 tc;" + "void main(void) {" + "     vec4 pix0 = texture2D(src0, tc);" + "     pix0 *= pix0;" + "     gl_FragData[0] = vec4(pix0.x + pix0.y, 0.0, 0.0, pix0.z + pix0.w);" + "}";
var shader_fs_qc_setbit1_single = "precision highp float;" + "  uniform sampler2D src0;" + "  uniform float value;" + "  varying vec2 tc;" + "void main(void) {" + "     vec4 pix0 = texture2D(src0, tc);" + "     gl_FragData[0] = mix(vec4(pix0.rg, 0.0, 0.0), vec4(0.0, 0.0, pix0.ba), value);" + "}";
var shader_fs_qc_scale_single = "precision highp float;" + "  uniform sampler2D src0;" + "  uniform float scale;" + "  varying vec2 tc;" + "void main(void) {" + "     gl_FragData[0] = scale * texture2D(src0, tc);" + "}";
var shader_fs_qc_not1_dual = "#extension GL_EXT_draw_buffers : require\n" + "precision highp float;" + "  uniform sampler2D src0;" + "  uniform sampler2D src1;" + "  varying vec2 tc;" + "void main(void) {" + "     vec4 pix0 = texture2D(src0, tc);" + "     vec4 pix1 = texture2D(src1, tc);" + "     gl_FragData[0] = pix0.barg;" + "     gl_FragData[1] = pix1.barg;" + "}";
var gl = null;
var do_gl_flush_timing = false;
function setupShader(name, pix, vtx) {
  var sh = gl.createProgram();
  gl.attachShader(sh, vtx);
  gl.attachShader(sh, getShader(gl, name, pix, gl.FRAGMENT_SHADER));
  gl.linkProgram(sh);
  gl.useProgram(sh);
  return sh;
}
function QCEngineWebGLBlock(gpuBlockSet) {
  this.blockSet = gpuBlockSet;
  this.textureData = [null];
  this.textureData[0] = gl.createTexture();
  this.blockSet.allBlocks.push(this.textureData[0]);
  gl.bindTexture(gl.TEXTURE_2D, this.textureData[0]);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.blockSet.width, this.blockSet.height, 0, gl.RGBA, gl.FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  this.op_debugfill = function(buf) {
    this.read_cache_is_valid = false;
    var src = this.textureData;
    if (buf != null) {
      src = [buf];
    }
    gl.useProgram(this.blockSet.prog_qc_debugfill_single);
    this.blockSet.apply(0, 1, null, src, null, false);
  };
  this.op_clear = function(valueAtZero) {
    this.read_cache_is_valid = false;
    if (this.blockSet.debug) {
      this.debug_print("Before op_clear: ");
    }
    gl.useProgram(this.blockSet.prog_qc_clear_single);
    gl.uniform1f(this.blockSet.arg_clear_single_value_at_zero, valueAtZero);
    this.blockSet.apply(0, 1, null, this.textureData, null, false);
    if (this.blockSet.debug) {
      this.debug_print("After op_clear: ");
    }
  };
  this.op_not = function(targetBit, condBits, condNotBits, pairBlock) {
    this.read_cache_is_valid = false;
    if (this.blockSet.debug) {
      this.debug_print("Before op_not(" + targetBit + ", " + condBits + ", " + condNotBits + "): ");
    }
    if (this.blockSet.debug && pairBlock && pairBlock != this) {
      pairBlock.debug_print("(pair) Before op_not(" + targetBit + "): ");
    }
    if (condBits || condNotBits) {
      this.blockSet.createConditionMask(condBits, condNotBits);
      if (pairBlock && pairBlock != this) {
        var src = [this.textureData[0], pairBlock.textureData[0]];
        gl.useProgram(this.blockSet.prog_qc_cnot_cross);
        this.blockSet.apply(0, 2, src, this.blockSet.scratchData, this.blockSet.conditionMask, true);
        this.textureData[0] = src[0];
        pairBlock.textureData[0] = src[1];
      } else {
        if (targetBit == 1) {
          gl.useProgram(this.blockSet.prog_qc_cnot1_single);
          this.blockSet.apply(0, 1, this.textureData, this.blockSet.scratchData, this.blockSet.conditionMask, true);
        } else {
          var span = this.blockSet.set_span_args(targetBit);
          gl.useProgram(this.blockSet.prog_qc_cnot_single);
          if (this.blockSet.arg_cnot_single_xspan_CURR != span.xspan) {
            gl.uniform1f(this.blockSet.arg_cnot_single_xspan, span.xspan);
            gl.uniform1f(this.blockSet.arg_cnot_single_inv_xspan, span.inv_xspan);
            this.blockSet.arg_cnot_single_xspan_CURR = span.xspan;
          }
          if (this.blockSet.arg_cnot_single_yspan_CURR != span.yspan) {
            gl.uniform1f(this.blockSet.arg_cnot_single_yspan, span.yspan);
            gl.uniform1f(this.blockSet.arg_cnot_single_inv_yspan, span.inv_yspan);
            this.blockSet.arg_cnot_single_yspan_CURR = span.yspan;
          }
          this.blockSet.apply(0, 1, this.textureData, this.blockSet.scratchData, this.blockSet.conditionMask, true);
        }
      }
    } else {
      if (targetBit == 1) {
        gl.useProgram(this.blockSet.prog_qc_not1_single);
        this.blockSet.apply(0, 1, this.textureData, this.blockSet.scratchData, null, true);
      } else {
        var span = this.blockSet.set_span_args(targetBit);
        gl.useProgram(this.blockSet.prog_qc_not_single);
        if (this.blockSet.arg_not_single_xspan_CURR != span.xspan) {
          gl.uniform1f(this.blockSet.arg_not_single_xspan, span.xspan);
          gl.uniform1f(this.blockSet.arg_not_single_inv_xspan, span.inv_xspan);
          this.blockSet.arg_not_single_xspan_CURR = span.xspan;
        }
        if (this.blockSet.arg_not_single_yspan_CURR != span.yspan) {
          gl.uniform1f(this.blockSet.arg_not_single_yspan, span.yspan);
          gl.uniform1f(this.blockSet.arg_not_single_inv_yspan, span.inv_yspan);
          this.blockSet.arg_not_single_yspan_CURR = span.yspan;
        }
        this.blockSet.apply(0, 1, this.textureData, this.blockSet.scratchData, null, true);
      }
    }
    if (this.blockSet.debug) {
      this.debug_print("After op_not(" + targetBit + ", " + condBits + ", " + condNotBits + "): ");
    }
    if (this.blockSet.debug && pairBlock && pairBlock != this) {
      pairBlock.debug_print("(pair) After op_not(" + targetBit + "): ");
    }
  };
  this.op_phase = function(condBits, condNotBits, sval, cval) {
    this.read_cache_is_valid = false;
    if (this.blockSet.debug) {
      this.debug_print("Before op_phase(" + condBits + ", " + condNotBits + "): ");
    }
    this.blockSet.createConditionMask(condBits, condNotBits);
    gl.useProgram(this.blockSet.prog_qc_phase);
    gl.uniform1f(this.blockSet.arg_phase_sval, sval);
    gl.uniform1f(this.blockSet.arg_phase_cval, cval);
    this.blockSet.apply(0, 1, this.textureData, this.blockSet.scratchData, this.blockSet.conditionMask, true);
    if (this.blockSet.debug) {
      this.debug_print("After op_phase(" + condBits + ", " + condNotBits + "): ");
    }
  };
  this.op_2x2 = function(targetBit, mtx2x2, pairBlock) {
    this.read_cache_is_valid = false;
    if (this.blockSet.debug) {
      this.debug_print("Before op_2x2(" + targetBit + "): ");
    }
    if (this.blockSet.debug && pairBlock != this) {
      pairBlock.debug_print("(pair) Before op_2x2(" + targetBit + "): ");
    }
    if (this.blockSet.debug) {
      console.log(mtx2x2);
    }
    if (pairBlock != this) {
      var src = [this.textureData[0], pairBlock.textureData[0]];
      gl.useProgram(this.blockSet.prog_qc_2x2_cross);
      gl.uniform1f(this.blockSet.arg_2x2_cross_m00r, mtx2x2[0][0].real);
      gl.uniform1f(this.blockSet.arg_2x2_cross_m01r, mtx2x2[0][1].real);
      gl.uniform1f(this.blockSet.arg_2x2_cross_m10r, mtx2x2[1][0].real);
      gl.uniform1f(this.blockSet.arg_2x2_cross_m11r, mtx2x2[1][1].real);
      gl.uniform1f(this.blockSet.arg_2x2_cross_m00i, mtx2x2[0][0].imag);
      gl.uniform1f(this.blockSet.arg_2x2_cross_m01i, mtx2x2[0][1].imag);
      gl.uniform1f(this.blockSet.arg_2x2_cross_m10i, mtx2x2[1][0].imag);
      gl.uniform1f(this.blockSet.arg_2x2_cross_m11i, mtx2x2[1][1].imag);
      this.blockSet.apply(0, 2, src, this.blockSet.scratchData, null, true);
      this.textureData[0] = src[0];
      pairBlock.textureData[0] = src[1];
    } else {
      if (targetBit == 1) {
        gl.useProgram(this.blockSet.prog_qc_2x21_single);
        gl.uniform1f(this.blockSet.arg_2x21_m00r, mtx2x2[0][0].real);
        gl.uniform1f(this.blockSet.arg_2x21_m01r, mtx2x2[0][1].real);
        gl.uniform1f(this.blockSet.arg_2x21_m10r, mtx2x2[1][0].real);
        gl.uniform1f(this.blockSet.arg_2x21_m11r, mtx2x2[1][1].real);
        gl.uniform1f(this.blockSet.arg_2x21_m00i, mtx2x2[0][0].imag);
        gl.uniform1f(this.blockSet.arg_2x21_m01i, mtx2x2[0][1].imag);
        gl.uniform1f(this.blockSet.arg_2x21_m10i, mtx2x2[1][0].imag);
        gl.uniform1f(this.blockSet.arg_2x21_m11i, mtx2x2[1][1].imag);
        this.blockSet.apply(0, 1, this.textureData, this.blockSet.scratchData, null, true);
      } else {
        var span = this.blockSet.set_span_args(targetBit);
        gl.useProgram(this.blockSet.prog_qc_2x2_single);
        gl.uniform1f(this.blockSet.arg_2x2_single_xspan, span.xspan);
        gl.uniform1f(this.blockSet.arg_2x2_single_yspan, span.yspan);
        gl.uniform1f(this.blockSet.arg_2x2_single_inv_xspan, span.inv_xspan);
        gl.uniform1f(this.blockSet.arg_2x2_single_inv_yspan, span.inv_yspan);
        gl.uniform1f(this.blockSet.arg_2x2_m00r, mtx2x2[0][0].real);
        gl.uniform1f(this.blockSet.arg_2x2_m01r, mtx2x2[0][1].real);
        gl.uniform1f(this.blockSet.arg_2x2_m10r, mtx2x2[1][0].real);
        gl.uniform1f(this.blockSet.arg_2x2_m11r, mtx2x2[1][1].real);
        gl.uniform1f(this.blockSet.arg_2x2_m00i, mtx2x2[0][0].imag);
        gl.uniform1f(this.blockSet.arg_2x2_m01i, mtx2x2[0][1].imag);
        gl.uniform1f(this.blockSet.arg_2x2_m10i, mtx2x2[1][0].imag);
        gl.uniform1f(this.blockSet.arg_2x2_m11i, mtx2x2[1][1].imag);
        this.blockSet.apply(0, 1, this.textureData, this.blockSet.scratchData, null, true);
      }
    }
    if (this.blockSet.debug) {
      this.debug_print("After op_2x2(" + targetBit + "): ");
    }
    if (this.blockSet.debug && pairBlock != this) {
      pairBlock.debug_print("(pair) After op_2x2(" + targetBit + "): ");
    }
  };
  this.ready_read_cache = function() {
    if (1 || this.blockSet.use_read_cache) {
      if (!this.read_cache_is_valid) {
        var src = this.textureData[0];
        this.read_cache = this.blockSet.peek_values(this.read_cache, src, this.width, this.height, 0, 0);
        this.cache_is_valid = true;
      }
      return true;
    }
    return false;
  };
  this.peek_probability = function(targetBit) {
    if (this.blockSet.debug) {
      this.debug_print("Before op_peek_probability(" + targetBit + "): ");
    }
    var do_length_squared = false;
    if (targetBit == 0) {
      do_length_squared = true;
      targetBit = 1;
    }
    if (targetBit == 1) {
      gl.useProgram(this.blockSet.prog_qc_filterbit1_single);
      this.blockSet.apply(0, 1, this.textureData, this.blockSet.scratchData, null, false);
    } else {
      var span = this.blockSet.set_span_args(targetBit);
      gl.useProgram(this.blockSet.prog_qc_filterbit_single);
      gl.uniform1f(this.blockSet.arg_filterbit_single_xspan, span.xspan);
      gl.uniform1f(this.blockSet.arg_filterbit_single_yspan, span.yspan);
      gl.uniform1f(this.blockSet.arg_filterbit_single_inv_xspan, span.inv_xspan);
      gl.uniform1f(this.blockSet.arg_filterbit_single_inv_yspan, span.inv_yspan);
      this.blockSet.apply(0, 1, this.textureData, this.blockSet.scratchData, null, false);
    }
    var w = this.blockSet.width;
    var h = this.blockSet.height;
    var src = [this.blockSet.scratchData[0]];
    var dst = [this.blockSet.scratchData[1]];
    while (w >= 4 && h >= 4) {
      w >>= 2;
      h >>= 2;
      if (this.blockSet.debug) {
        console.log("add4x4 w:" + w + " h:" + h);
      }
      gl.useProgram(this.blockSet.prog_qc_add4x4_single);
      gl.uniform1f(this.blockSet.arg_add4x4_single_wfactor, w / this.blockSet.width);
      gl.uniform1f(this.blockSet.arg_add4x4_single_hfactor, h / this.blockSet.height);
      if (this.blockSet.debug) {
        this.debug_print("before mid-2 op_peek_probability(" + targetBit + "): ", src[0]);
      }
      this.blockSet.apply(0, 1, src, dst, null, true, w / this.blockSet.width, h / this.blockSet.height);
      if (this.blockSet.debug) {
        this.debug_print("after mid-2 op_peek_probability(" + targetBit + "): ", src[0]);
      }
    }
    var buffer = this.peek_values(null, src[0], w, h);
    var count = w * h * 4;
    var probability = 0;
    if (do_length_squared) {
      for (var i = 0;i < count;++i) {
        probability += buffer[i];
      }
    } else {
      for (var i = 1;i < count;i += 2) {
        probability += buffer[i];
      }
    }
    if (this.blockSet.debug) {
      this.debug_print("After op_peek_probability(" + targetBit + ") = " + probability);
    }
    return probability;
  };
  this.op_set_bits = function(targetQubits, targetValues) {
    this.read_cache_is_valid = false;
    if (this.blockSet.debug) {
      this.debug_print("Before op_set_bits(" + targetQubits + ", " + targetValues + "): ");
    }
    if (targetQubits & 1) {
      var value = targetValues & 1;
      gl.useProgram(this.blockSet.prog_qc_setbit1_single);
      gl.uniform1f(this.blockSet.arg_setbit1_single_value, value);
      this.blockSet.apply(0, 1, this.textureData, this.blockSet.scratchData, null, true);
    }
    for (var bit = 1;bit < this.blockSet.qReg.numBlockQubits;++bit) {
      var mask = 1 << bit;
      if (targetQubits & mask) {
        var value = (targetValues & mask) >> bit;
        var span = this.blockSet.set_span_args(mask);
        gl.useProgram(this.blockSet.prog_qc_setbit_single);
        gl.uniform1f(this.blockSet.arg_setbit_single_xspan, span.xspan);
        gl.uniform1f(this.blockSet.arg_setbit_single_yspan, span.yspan);
        gl.uniform1f(this.blockSet.arg_setbit_single_inv_xspan, span.inv_xspan);
        gl.uniform1f(this.blockSet.arg_setbit_single_inv_yspan, span.inv_yspan);
        gl.uniform1f(this.blockSet.arg_setbit_single_value, value);
        this.blockSet.apply(0, 1, this.textureData, this.blockSet.scratchData, null, true);
      }
    }
    if (this.blockSet.debug) {
      this.debug_print("After op_set_bits(" + targetQubits + ", " + targetValues + "): ");
    }
  };
  this.op_scale = function(scale) {
    this.read_cache_is_valid = false;
    if (scale == 1) {
      return;
    }
    if (this.blockSet.debug) {
      this.debug_print("Before op_scale(" + scale + "): ");
    }
    gl.useProgram(this.blockSet.prog_qc_scale_single);
    gl.uniform1f(this.blockSet.arg_scale_single_scale, scale);
    this.blockSet.apply(0, 1, this.textureData, this.blockSet.scratchData, null, true);
    if (this.blockSet.debug) {
      this.debug_print("After op_scale(" + scale + "): ");
    }
  };
  this.peek_values = function(dst, src, width, height) {
    if (src == null) {
      src = this.textureData[0];
    }
    return this.blockSet.peek_values(dst, src, width, height);
  };
  this.peek_complex_value = function(targetValue) {
    if (this.ready_read_cache()) {
      return new Vec2(this.read_cache[targetValue * 2], this.read_cache[targetValue * 2 + 1]);
    }
    var pix_index = targetValue >> 1;
    var src = this.textureData[0];
    var start_x = pix_index % this.blockSet.width;
    var start_y = Math.floor(pix_index / this.blockSet.width);
    var dst = this.blockSet.peek_values(null, src, 1, 1, start_x, start_y);
    if (targetValue & 1) {
      return new Vec2(dst[2], dst[3]);
    } else {
      return new Vec2(dst[0], dst[1]);
    }
  };
  this.debug_print = function(message, buffer) {
    if (buffer == null) {
      buffer = this.textureData[0];
    }
    this.blockSet.debug_print(message, buffer);
  };
  this.side_by_side_check = function(message, cpu_buffer, gpu_val, cpu_val) {
    var tolerance = .01;
    if (message == null) {
      message = "";
    }
    if (cpu_buffer) {
      var gpu_buffer = this.peek_values(null, null);
      for (var i = 0;i < cpu_buffer.length;++i) {
        var diff = Math.abs(cpu_buffer[i] - gpu_buffer[i]);
        if (diff > tolerance || isNaN(gpu_buffer[i]) || isNaN(cpu_buffer[i])) {
          console.log("SxS error (" + message + "): at [" + i + "] gpu:" + gpu_buffer[i] + " cpu:" + cpu_buffer[i] + ".");
          console.log(gpu_buffer);
          console.log(cpu_buffer);
          crash.here();
        }
      }
    } else {
      var diff = Math.abs(cpu_val - gpu_val);
      if (diff > tolerance || isNaN(gpu_val) || isNaN(cpu_val)) {
        console.log("SxS error (" + message + "): gpu:" + gpu_val + " cpu:" + cpu_val + ".");
        crash.here();
      }
    }
  };
  this.destruct = function() {
    for (var i = 0;i < this.blockSet.allBlocks.length;++i) {
      if (this.blockSet.allBlocks[i] == this.textureData[0]) {
        this.blockSet.allBlocks[i] = null;
      }
    }
    gl.deleteTexture(this.textureData[0]);
  };
}
function QCEngineWebGLBlockSet(canvas_name) {
  this.width = 16;
  this.height = 16;
  this.allBlocks = [];
  this.ready = false;
  this.debug = false;
  this.side_by_side_checking = false;
  this.savedCondMasks = {};
  this.numSavedCondMasks = 0;
  this.canvas = document.getElementById(canvas_name);
  this.canvas.width = this.width;
  this.canvas.height = this.height;
  this.use_read_cache = true;
  this.initialize = function(qReg) {
    this.ready = false;
    for (var i = 0;i < this.allBlocks.length;++i) {
      if (this.allBlocks[i] != null) {
        gl.deleteTexture(this.allBlocks[i]);
      }
    }
    this.allBlocks = [];
    this.savedCondMasks = {};
    this.numSavedCondMasks = 0;
    this.qReg = qReg;
    this.heightQubits = Math.floor(qReg.numBlockQubits / 2);
    this.widthQubits = qReg.numBlockQubits - this.heightQubits;
    this.width = 1 << this.widthQubits - 1;
    this.height = 1 << this.heightQubits;
    this.ext = null;
    if (this.canvas) {
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    }
    try {
      if (gl == null) {
        gl = this.canvas.getContext("experimental-webgl");
      }
    } catch (e$4) {
    }
    if (!gl) {
      alert("Can't get WebGL");
      return false;
    }
    gl.viewport(0, 0, this.width, this.height);
    if (!window.WebGLRenderingContext) {
      alert("Your browser does not support WebGL. See http://get.webgl.org");
      return false;
    }
    try {
      this.ext = gl.getExtension("OES_texture_float");
    } catch (e$5) {
    }
    if (!this.ext) {
      alert("Your browser does not support OES_texture_float extension");
      return false;
    }
    this.ext_buff = gl.getExtension("WEBGL_draw_buffers");
    if (!this.ext_buff) {
      alert("Your browser does not support WEBGL_draw_buffers extension");
      return false;
    }
    var vshader = getShader(gl, "shader_vs", shader_vs, gl.VERTEX_SHADER);
    this.prog_qc_show = setupShader("shader_fs_qc_show", shader_fs_qc_show, vshader);
    gl.uniform1i(gl.getUniformLocation(this.prog_qc_show, "samp"), 0);
    this.prog_qc_debugfill_single = setupShader("shader_fs_qc_debugfill_single", shader_fs_qc_debugfill_single, vshader);
    gl.uniform1f(gl.getUniformLocation(this.prog_qc_debugfill_single, "height"), this.height);
    gl.uniform1f(gl.getUniformLocation(this.prog_qc_debugfill_single, "width"), this.width);
    this.prog_qc_condmask1 = setupShader("shader_fs_qc_condmask1", shader_fs_qc_condmask1, vshader);
    this.arg_condmask1_zeroVal = gl.getUniformLocation(this.prog_qc_condmask1, "zeroVal");
    this.arg_condmask1_oneVal = gl.getUniformLocation(this.prog_qc_condmask1, "oneVal");
    this.prog_qc_condmask = setupShader("shader_fs_qc_condmask", shader_fs_qc_condmask, vshader);
    this.arg_condmask_xspan = gl.getUniformLocation(this.prog_qc_condmask, "xspan");
    this.arg_condmask_yspan = gl.getUniformLocation(this.prog_qc_condmask, "yspan");
    this.arg_condmask_inv_xspan = gl.getUniformLocation(this.prog_qc_condmask, "inv_xspan");
    this.arg_condmask_inv_yspan = gl.getUniformLocation(this.prog_qc_condmask, "inv_yspan");
    this.arg_condmask_zeroVal = gl.getUniformLocation(this.prog_qc_condmask, "zeroVal");
    this.arg_condmask_oneVal = gl.getUniformLocation(this.prog_qc_condmask, "oneVal");
    this.prog_qc_clear_single = setupShader("shader_fs_qc_clear_single", shader_fs_qc_clear_single, vshader);
    gl.uniform1f(gl.getUniformLocation(this.prog_qc_clear_single, "row_scale"), this.height);
    gl.uniform1f(gl.getUniformLocation(this.prog_qc_clear_single, "column_scale"), this.width);
    this.arg_clear_single_value_at_zero = gl.getUniformLocation(this.prog_qc_clear_single, "value_at_zero");
    this.prog_qc_clear_dual = setupShader("shader_fs_qc_clear_dual", shader_fs_qc_clear_dual, vshader);
    gl.uniform1f(gl.getUniformLocation(this.prog_qc_clear_dual, "row_scale"), this.height);
    gl.uniform1f(gl.getUniformLocation(this.prog_qc_clear_dual, "column_scale"), this.width);
    this.arg_clear_dual_value_at_zero = gl.getUniformLocation(this.prog_qc_clear_dual, "value_at_zero");
    this.prog_qc_not1_single = setupShader("shader_fs_qc_not1_single", shader_fs_qc_not1_single, vshader);
    gl.uniform1i(gl.getUniformLocation(this.prog_qc_not1_single, "src0"), 0);
    this.prog_qc_cnot1_single = setupShader("shader_fs_qc_cnot1_single", shader_fs_qc_cnot1_single, vshader);
    gl.uniform1i(gl.getUniformLocation(this.prog_qc_cnot1_single, "src0"), 0);
    gl.uniform1i(gl.getUniformLocation(this.prog_qc_cnot1_single, "condMask"), 2);
    this.prog_qc_2x21_single = setupShader("shader_fs_qc_2x21_single", shader_fs_qc_2x21_single, vshader);
    gl.uniform1i(gl.getUniformLocation(this.prog_qc_2x21_single, "src0"), 0);
    this.arg_2x21_m00r = gl.getUniformLocation(this.prog_qc_2x21_single, "m00r");
    this.arg_2x21_m01r = gl.getUniformLocation(this.prog_qc_2x21_single, "m01r");
    this.arg_2x21_m10r = gl.getUniformLocation(this.prog_qc_2x21_single, "m10r");
    this.arg_2x21_m11r = gl.getUniformLocation(this.prog_qc_2x21_single, "m11r");
    this.arg_2x21_m00i = gl.getUniformLocation(this.prog_qc_2x21_single, "m00i");
    this.arg_2x21_m01i = gl.getUniformLocation(this.prog_qc_2x21_single, "m01i");
    this.arg_2x21_m10i = gl.getUniformLocation(this.prog_qc_2x21_single, "m10i");
    this.arg_2x21_m11i = gl.getUniformLocation(this.prog_qc_2x21_single, "m11i");
    this.prog_qc_filterbit1_single = setupShader("shader_fs_qc_filterbit1_single", shader_fs_qc_filterbit1_single, vshader);
    gl.uniform1i(gl.getUniformLocation(this.prog_qc_filterbit1_single, "src0"), 0);
    this.prog_qc_setbit1_single = setupShader("shader_fs_qc_setbit1_single", shader_fs_qc_setbit1_single, vshader);
    gl.uniform1i(gl.getUniformLocation(this.prog_qc_setbit1_single, "src0"), 0);
    this.arg_setbit1_single_value = gl.getUniformLocation(this.prog_qc_setbit1_single, "value");
    this.prog_qc_scale_single = setupShader("shader_fs_qc_scale_single", shader_fs_qc_scale_single, vshader);
    gl.uniform1i(gl.getUniformLocation(this.prog_qc_scale_single, "src0"), 0);
    this.arg_scale_single_scale = gl.getUniformLocation(this.prog_qc_scale_single, "scale");
    this.prog_qc_not_single = setupShader("shader_fs_qc_not_single", shader_fs_qc_not_single, vshader);
    gl.uniform1i(gl.getUniformLocation(this.prog_qc_not_single, "src0"), 0);
    this.arg_not_single_xspan = gl.getUniformLocation(this.prog_qc_not_single, "xspan");
    this.arg_not_single_yspan = gl.getUniformLocation(this.prog_qc_not_single, "yspan");
    this.arg_not_single_inv_xspan = gl.getUniformLocation(this.prog_qc_not_single, "inv_xspan");
    this.arg_not_single_inv_yspan = gl.getUniformLocation(this.prog_qc_not_single, "inv_yspan");
    this.arg_not_single_xspan_CURR = null;
    this.arg_not_single_yspan_CURR = null;
    this.prog_qc_cnot_single = setupShader("shader_fs_qc_cnot_single", shader_fs_qc_cnot_single, vshader);
    gl.uniform1i(gl.getUniformLocation(this.prog_qc_cnot_single, "src0"), 0);
    gl.uniform1i(gl.getUniformLocation(this.prog_qc_cnot_single, "condMask"), 2);
    this.arg_cnot_single_xspan = gl.getUniformLocation(this.prog_qc_cnot_single, "xspan");
    this.arg_cnot_single_yspan = gl.getUniformLocation(this.prog_qc_cnot_single, "yspan");
    this.arg_cnot_single_inv_xspan = gl.getUniformLocation(this.prog_qc_cnot_single, "inv_xspan");
    this.arg_cnot_single_inv_yspan = gl.getUniformLocation(this.prog_qc_cnot_single, "inv_yspan");
    this.arg_cnot_single_xspan_CURR = null;
    this.arg_cnot_single_yspan_CURR = null;
    this.prog_qc_cnot_cross = setupShader("shader_fs_qc_cnot_cross", shader_fs_qc_cnot_cross, vshader);
    gl.uniform1i(gl.getUniformLocation(this.prog_qc_cnot_cross, "src0"), 0);
    gl.uniform1i(gl.getUniformLocation(this.prog_qc_cnot_cross, "src1"), 1);
    gl.uniform1i(gl.getUniformLocation(this.prog_qc_cnot_cross, "condMask"), 2);
    this.prog_qc_phase = setupShader("shader_fs_qc_phase", shader_fs_qc_phase, vshader);
    gl.uniform1i(gl.getUniformLocation(this.prog_qc_phase, "src0"), 0);
    gl.uniform1i(gl.getUniformLocation(this.prog_qc_phase, "condMask"), 2);
    this.arg_phase_sval = gl.getUniformLocation(this.prog_qc_phase, "sval");
    this.arg_phase_cval = gl.getUniformLocation(this.prog_qc_phase, "cval");
    this.prog_qc_2x2_single = setupShader("shader_fs_qc_2x2_single", shader_fs_qc_2x2_single, vshader);
    gl.uniform1i(gl.getUniformLocation(this.prog_qc_2x2_single, "src0"), 0);
    this.arg_2x2_single_xspan = gl.getUniformLocation(this.prog_qc_2x2_single, "xspan");
    this.arg_2x2_single_yspan = gl.getUniformLocation(this.prog_qc_2x2_single, "yspan");
    this.arg_2x2_single_inv_xspan = gl.getUniformLocation(this.prog_qc_2x2_single, "inv_xspan");
    this.arg_2x2_single_inv_yspan = gl.getUniformLocation(this.prog_qc_2x2_single, "inv_yspan");
    this.arg_2x2_m00r = gl.getUniformLocation(this.prog_qc_2x2_single, "m00r");
    this.arg_2x2_m01r = gl.getUniformLocation(this.prog_qc_2x2_single, "m01r");
    this.arg_2x2_m10r = gl.getUniformLocation(this.prog_qc_2x2_single, "m10r");
    this.arg_2x2_m11r = gl.getUniformLocation(this.prog_qc_2x2_single, "m11r");
    this.arg_2x2_m00i = gl.getUniformLocation(this.prog_qc_2x2_single, "m00i");
    this.arg_2x2_m01i = gl.getUniformLocation(this.prog_qc_2x2_single, "m01i");
    this.arg_2x2_m10i = gl.getUniformLocation(this.prog_qc_2x2_single, "m10i");
    this.arg_2x2_m11i = gl.getUniformLocation(this.prog_qc_2x2_single, "m11i");
    this.prog_qc_2x2_cross = setupShader("shader_fs_qc_2x2_cross", shader_fs_qc_2x2_cross, vshader);
    gl.uniform1i(gl.getUniformLocation(this.prog_qc_2x2_cross, "src0"), 0);
    gl.uniform1i(gl.getUniformLocation(this.prog_qc_2x2_cross, "src1"), 1);
    this.arg_2x2_cross_m00r = gl.getUniformLocation(this.prog_qc_2x2_cross, "m00r");
    this.arg_2x2_cross_m01r = gl.getUniformLocation(this.prog_qc_2x2_cross, "m01r");
    this.arg_2x2_cross_m10r = gl.getUniformLocation(this.prog_qc_2x2_cross, "m10r");
    this.arg_2x2_cross_m11r = gl.getUniformLocation(this.prog_qc_2x2_cross, "m11r");
    this.arg_2x2_cross_m00i = gl.getUniformLocation(this.prog_qc_2x2_cross, "m00i");
    this.arg_2x2_cross_m01i = gl.getUniformLocation(this.prog_qc_2x2_cross, "m01i");
    this.arg_2x2_cross_m10i = gl.getUniformLocation(this.prog_qc_2x2_cross, "m10i");
    this.arg_2x2_cross_m11i = gl.getUniformLocation(this.prog_qc_2x2_cross, "m11i");
    this.prog_qc_filterbit_single = setupShader("shader_fs_qc_filterbit_single", shader_fs_qc_filterbit_single, vshader);
    gl.uniform1i(gl.getUniformLocation(this.prog_qc_filterbit_single, "src0"), 0);
    this.arg_filterbit_single_xspan = gl.getUniformLocation(this.prog_qc_filterbit_single, "xspan");
    this.arg_filterbit_single_yspan = gl.getUniformLocation(this.prog_qc_filterbit_single, "yspan");
    this.arg_filterbit_single_inv_xspan = gl.getUniformLocation(this.prog_qc_filterbit_single, "inv_xspan");
    this.arg_filterbit_single_inv_yspan = gl.getUniformLocation(this.prog_qc_filterbit_single, "inv_yspan");
    this.prog_qc_add4x4_single = setupShader("shader_fs_qc_add4x4_single", shader_fs_qc_add4x4_single, vshader);
    gl.uniform1i(gl.getUniformLocation(this.prog_qc_add4x4_single, "src0"), 0);
    this.arg_add4x4_single_wfactor = gl.getUniformLocation(this.prog_qc_add4x4_single, "wfactor");
    this.arg_add4x4_single_hfactor = gl.getUniformLocation(this.prog_qc_add4x4_single, "hfactor");
    this.prog_qc_setbit_single = setupShader("shader_fs_qc_setbit_single", shader_fs_qc_setbit_single, vshader);
    gl.uniform1i(gl.getUniformLocation(this.prog_qc_setbit_single, "src0"), 0);
    this.arg_setbit_single_xspan = gl.getUniformLocation(this.prog_qc_setbit_single, "xspan");
    this.arg_setbit_single_yspan = gl.getUniformLocation(this.prog_qc_setbit_single, "yspan");
    this.arg_setbit_single_inv_xspan = gl.getUniformLocation(this.prog_qc_setbit_single, "inv_xspan");
    this.arg_setbit_single_inv_yspan = gl.getUniformLocation(this.prog_qc_setbit_single, "inv_yspan");
    this.arg_setbit_single_value = gl.getUniformLocation(this.prog_qc_setbit_single, "value");
    this.prog_qc_not1_dual = setupShader("shader_fs_qc_not1_dual", shader_fs_qc_not1_dual, vshader);
    gl.uniform1i(gl.getUniformLocation(this.prog_qc_not1_dual, "src0"), 0);
    gl.uniform1i(gl.getUniformLocation(this.prog_qc_not1_dual, "src1"), 1);
    gl.useProgram(this.prog_qc_show);
    var aPosLoc = gl.getAttribLocation(this.prog_qc_show, "aPos");
    var aTexLoc = gl.getAttribLocation(this.prog_qc_show, "aTexCoord");
    gl.enableVertexAttribArray(aPosLoc);
    gl.enableVertexAttribArray(aTexLoc);
    var data = new Float32Array([-1, -1, 0, 0, 1, -1, 1, 0, -1, 1, 0, 1, 1, 1, 1, 1]);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, gl.FALSE, 16, 0);
    gl.vertexAttribPointer(aTexLoc, 2, gl.FLOAT, gl.FALSE, 16, 8);
    this.scratchData = [null, null];
    for (var i = 0;i < 2;++i) {
      this.scratchData[i] = gl.createTexture();
      this.allBlocks.push(this.scratchData[i]);
      gl.bindTexture(gl.TEXTURE_2D, this.scratchData[i]);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    }
    this.conditionMask = [null];
    this.conditionMaskValue = -1;
    this.conditionMaskNotValue = -1;
    this.FBO = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.FBO);
    this.fbTex = [this.scratchData[0], this.scratchData[1]];
    gl.framebufferTexture2D(gl.FRAMEBUFFER, this.ext_buff.COLOR_ATTACHMENT0_WEBGL, gl.TEXTURE_2D, this.fbTex[0], 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, this.ext_buff.COLOR_ATTACHMENT1_WEBGL, gl.TEXTURE_2D, this.fbTex[1], 0);
    this.ext_buff.drawBuffersWEBGL([this.ext_buff.COLOR_ATTACHMENT0_WEBGL, this.ext_buff.COLOR_ATTACHMENT1_WEBGL]);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
      alert("Your browser does not support FLOAT as the color attachment to an FBO");
      return false;
    }
    console.log("GPU acceleration: " + this.qReg.numBlocks + " blocks of " + this.width + "x" + this.height + " each... ok.");
    this.ready = true;
    return true;
  };
  this.allocateNewConditionMask = function() {
    var condMask = gl.createTexture();
    this.allBlocks.push(condMask);
    gl.bindTexture(gl.TEXTURE_2D, condMask);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    return condMask;
  };
  this.set_span_args = function(targetBit) {
    var span_args = {xspan:0, yspan:0, inv_xspan:0, inv_yspan:0};
    if (targetBit < 1 << this.widthQubits) {
      span_args.xspan = 2 * this.width / targetBit;
      span_args.inv_xspan = 1 / span_args.xspan;
    } else {
      span_args.inv_yspan = (targetBit >> this.widthQubits) / this.height;
      span_args.yspan = 1 / span_args.inv_yspan;
    }
    return span_args;
  };
  this.debug_print = function(message, buffer) {
    if (message == null) {
      message = "";
    }
    var w = 6;
    var h = 6;
    w = Math.min(w, this.width);
    h = Math.min(h, this.height);
    temp_array = this.peek_values(null, buffer, w, h);
    console.log("  " + message);
    console.log(temp_array);
  };
  this.peek_values = function(dst, src, width, height, start_x, start_y) {
    if (src == null) {
      crash.here();
    }
    if (width == null) {
      width = this.width;
    }
    if (height == null) {
      height = this.height;
    }
    if (dst == null) {
      dst = new Float32Array(new ArrayBuffer(width * height * 4 * 4));
    }
    if (start_x == null) {
      start_x = 0;
    }
    if (start_y == null) {
      start_y = 0;
    }
    gl.flush();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.FBO);
    this.fbTex[0] = src;
    this.fbTex[1] = null;
    gl.framebufferTexture2D(gl.FRAMEBUFFER, this.ext_buff.COLOR_ATTACHMENT0_WEBGL, gl.TEXTURE_2D, this.fbTex[0], 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, this.ext_buff.COLOR_ATTACHMENT1_WEBGL, gl.TEXTURE_2D, this.fbTex[1], 0);
    gl.readPixels(start_x, start_y, width, height, gl.RGBA, gl.FLOAT, dst);
    return dst;
  };
  this.createConditionMask = function(condBits, condNotBits) {
    if (condBits == this.conditionMaskValue && condNotBits == this.conditionMaskNotValue) {
      return;
    }
    this.conditionMaskValue = condBits;
    this.conditionMaskNotValue = condNotBits;
    if (this.debug && this.conditionMask[0]) {
      this.debug_print("Before createConditionMask(" + condBits + ", " + condNotBits + "): ", this.conditionMask[0]);
    }
    var maskName = condBits.toString();
    var savedMask = this.savedCondMasks[maskName];
    if (savedMask) {
      this.conditionMask[0] = savedMask;
      return;
    } else {
      this.numSavedCondMasks++;
      console.log("Num cond masks: " + this.numSavedCondMasks);
      var condMask = this.allocateNewConditionMask();
      this.conditionMask[0] = condMask;
      this.savedCondMasks[maskName] = condMask;
    }
    gl.useProgram(this.prog_qc_condmask1);
    gl.uniform1f(this.arg_condmask1_zeroVal, 1 - (condBits & 1));
    gl.uniform1f(this.arg_condmask1_oneVal, 1 - (condNotBits & 1));
    this.apply(0, 1, null, this.conditionMask, null, false);
    if (this.debug) {
      this.debug_print("]]]] ccm1(" + condBits + ", " + condNotBits + "): ", this.conditionMask[0]);
    }
    gl.useProgram(this.prog_qc_condmask);
    var mask = 2;
    var cbShift = condBits >> 1;
    var cnbShift = condNotBits >> 1;
    while (cbShift || cnbShift) {
      var span = this.set_span_args(mask);
      gl.uniform1f(this.arg_condmask_xspan, span.xspan);
      gl.uniform1f(this.arg_condmask_yspan, span.yspan);
      gl.uniform1f(this.arg_condmask_inv_xspan, span.inv_xspan);
      gl.uniform1f(this.arg_condmask_inv_yspan, span.inv_yspan);
      gl.uniform1f(this.arg_condmask_zeroVal, 1 - (cbShift & 1));
      gl.uniform1f(this.arg_condmask_oneVal, 1 - (cnbShift & 1));
      this.apply(0, 1, null, this.conditionMask, null, false);
      if (this.debug) {
        this.debug_print("]]]] ccm" + mask + "(" + condBits + ", " + condNotBits + "): ", this.conditionMask[0]);
      }
      mask <<= 1;
      cbShift >>= 1;
      cnbShift >>= 1;
    }
    if (this.debug) {
      this.debug_print("After createConditionMask(" + condBits + ", " + condNotBits + "): ", this.conditionMask[0]);
    }
  };
  this.apply = function(start, count, src, dst, cond, swap_after, limit_x, limit_y) {
    if (limit_x == null) {
      limit_x = 1;
    }
    if (limit_y == null) {
      limit_y = 1;
    }
    var restore_viewport = false;
    if (limit_x != 1 || limit_y != 1) {
      gl.viewport(0, 0, this.width * limit_x, this.height * limit_y);
      restore_viewport = true;
    }
    var desiredFB0 = this.fbTex[0];
    var desiredFB1 = this.fbTex[1];
    gl.activeTexture(gl.TEXTURE2);
    if (cond) {
      gl.bindTexture(gl.TEXTURE_2D, cond[0]);
    } else {
      gl.bindTexture(gl.TEXTURE_2D, null);
    }
    if (src) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, src[0]);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.FBO);
      desiredFB0 = dst[0];
      if (count >= 2) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, src[1]);
        desiredFB1 = dst[1];
      } else {
        desiredFB1 = null;
      }
      if (this.fbTex[0] != desiredFB0) {
        this.fbTex[0] = desiredFB0;
        gl.framebufferTexture2D(gl.FRAMEBUFFER, this.ext_buff.COLOR_ATTACHMENT0_WEBGL, gl.TEXTURE_2D, this.fbTex[0], 0);
      }
      if (this.fbTex[1] != desiredFB1) {
        this.fbTex[1] = desiredFB1;
        gl.framebufferTexture2D(gl.FRAMEBUFFER, this.ext_buff.COLOR_ATTACHMENT1_WEBGL, gl.TEXTURE_2D, this.fbTex[1], 0);
      }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (do_gl_flush_timing) {
        gl.flush();
        gl.finish();
      }
      if (swap_after) {
        for (var i = start;i < start + count;++i) {
          var temp = dst[i];
          dst[i] = src[i];
          src[i] = temp;
        }
      }
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.FBO);
      desiredFB0 = dst[0];
      if (count >= 2) {
        desiredFB1 = dst[1];
      } else {
        desiredFB1 = null;
      }
      if (this.fbTex[0] != desiredFB0) {
        this.fbTex[0] = desiredFB0;
        gl.framebufferTexture2D(gl.FRAMEBUFFER, this.ext_buff.COLOR_ATTACHMENT0_WEBGL, gl.TEXTURE_2D, this.fbTex[0], 0);
      }
      if (this.fbTex[1] != desiredFB1) {
        this.fbTex[1] = desiredFB1;
        gl.framebufferTexture2D(gl.FRAMEBUFFER, this.ext_buff.COLOR_ATTACHMENT1_WEBGL, gl.TEXTURE_2D, this.fbTex[1], 0);
      }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (do_gl_flush_timing) {
        gl.flush();
        gl.finish();
      }
    }
    if (restore_viewport) {
      gl.viewport(0, 0, this.width, this.height);
    }
  };
  this.allocateNewBlock = function() {
    return new QCEngineWebGLBlock(this);
  };
  this.drawToCanvas = function() {
    gl.flush();
    if (1) {
      var w = 16;
      var h = 1;
      temp_array = new Float32Array(new ArrayBuffer(w * h * 4 * 4));
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, temp_array);
      console.log(temp_array);
    }
    gl.useProgram(this.prog_qc_show);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.srcData[0]);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
}
function getShader(gl, name, source, type) {
  shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) == 0) {
    console.log(name + "\n" + gl.getShaderInfoLog(shader));
  }
  return shader;
}
;function MbcNode(node_index, inst_index, qubit_index, instruction) {
  this.node_index = node_index;
  this.inst_index = inst_index;
  this.qubit_index = qubit_index;
  this.final_qubit_index = this.node_index;
  this.instruction = instruction;
  this.measurement_phase = 0;
  this.pending_instructions = [];
}
function MbcLink(link_index, type, node0, node1) {
  this.link_index = link_index;
  this.type = type;
  this.node = [node0, node1];
}
function MeasurementBasedComputationConverter(qReg) {
  this.qReg = qReg;
  this.verbose = false;
  this.overlay_visible = false;
  this.use_alt_links = false;
  this.clear = function() {
    this.nodes = [];
    this.links = [];
    this.node_grid = [];
    this.pre_instructions = [];
    this.overlay_visible = false;
  };
  this.build_mbc_graph = function(use_alt_links) {
    this.use_alt_links = use_alt_links;
    this.bits_in_cluster = new BitField(0, this.qReg.numQubits);
    this.staff = this.qReg.staff;
    this.staff.clearParallelization();
    this.clear();
    for (var qubit_index = 0;qubit_index < this.qReg.numQubits;++qubit_index) {
      this.node_grid.push([]);
    }
    for (var inst_index = 0;inst_index < this.staff.instructions.length;++inst_index) {
      var inst = this.staff.instructions[inst_index];
      if (inst.op == "phase" && inst.theta == 180 && inst.conditionQubits.countOneBits() > 1) {
        var low = inst.conditionQubits.getLowestBitIndex();
        var high = inst.conditionQubits.getHighestBitIndex();
        var prev_cz_node = null;
        this.bits_in_cluster.orEquals(inst.conditionQubits);
        for (qubit_index = low;qubit_index <= high;++qubit_index) {
          if (inst.conditionQubits.getBit(qubit_index)) {
            this.analyze_pending_instructions(this.node_grid[qubit_index], inst_index);
            var node = this.add_node(inst_index, qubit_index, inst);
            if (prev_cz_node) {
              this.add_link("cz", node, prev_cz_node);
            }
            if (this.node_grid[qubit_index].length > 1) {
              this.add_link("rail", node, this.node_grid[qubit_index][this.node_grid[qubit_index].length - 2]);
            }
            prev_cz_node = node;
          }
        }
      } else {
        this.add_instruction(inst);
      }
    }
    this.overlay_visible = true;
    this.staff.draw();
    this.debug_print();
  };
  this.add_node = function(inst_index, qubit_index, inst) {
    var node_index = this.nodes.length;
    var node = new MbcNode(node_index, inst_index, qubit_index, inst);
    if (this.node_grid[qubit_index].length == 0) {
      node.is_input = true;
    }
    this.node_grid[qubit_index].push(node);
    this.nodes.push(node);
    return node;
  };
  this.add_link = function(type, node0, node1) {
    var link_index = this.links.length;
    var link = new MbcLink(link_index, type, node0, node1);
    this.links.push(link);
    return link;
  };
  this.add_instruction = function(inst) {
    var handled_ok = false;
    if (inst.op == "phase") {
      if (!this.bits_in_cluster.andIsNotEqualZero(inst.conditionQubits)) {
        this.pre_instructions.push(inst);
        return true;
      }
    } else {
      if (!this.bits_in_cluster.andIsNotEqualZero(inst.targetQubits)) {
        this.pre_instructions.push(inst);
        return true;
      }
    }
    if (inst.op == "hadamard") {
      handled_ok = this.add_pending_instruction_bits(inst, inst.targetQubits);
    } else {
      if (inst.op == "phase") {
        if (inst.conditionQubits.countOneBits() == 1) {
          handled_ok = this.add_pending_instruction_bits(inst, inst.conditionQubits);
        }
      } else {
        if (inst.op == "not" || inst.op == "cnot") {
          handled_ok = this.add_pending_instruction_bits(inst, inst.targetQubits);
        }
      }
    }
    if (!handled_ok) {
      this.add_error(inst.targetQubits);
      this.add_error(inst.conditionQubits);
    }
  };
  this.add_pending_instruction_bits = function(inst, qubits) {
    var low = qubits.getLowestBitIndex();
    var high = qubits.getHighestBitIndex();
    for (qubit_index = low;qubit_index <= high;++qubit_index) {
      var grid = this.node_grid[qubit_index];
      if (grid.length > 0) {
        var last = grid[grid.length - 1];
        last.pending_instructions.push(inst);
      }
    }
    return true;
  };
  this.ap_one_instruction = function(inst, ap) {
    if (inst.op == "phase" && inst.theta != 0) {
      if (ap.ending_op == "hadamard") {
        var in_between_index = .5 * (ap.curr_node.inst_index + ap.next_inst_index);
        ap.curr_node = this.add_node(in_between_index, ap.node.qubit_index, null);
        ap.curr_node.is_auto_added = true;
        this.add_link("rail", ap.node, ap.curr_node);
      }
      ap.ending_op = inst.op;
      ap.curr_node.measurement_phase += inst.theta;
    } else {
      if (inst.op == "hadamard") {
        if (ap.ending_op == "hadamard") {
          ap.ending_op = "";
        } else {
          ap.ending_op = inst.op;
        }
      } else {
        if (inst.op == "not" || inst.op == "cnot") {
          this.ap_one_instruction({op:"hadamard"}, ap);
          this.ap_one_instruction({op:"phase", theta:180}, ap);
          this.ap_one_instruction({op:"hadamard"}, ap);
        } else {
          this.add_error();
        }
      }
    }
  };
  this.analyze_pending_instructions = function(grid, next_inst_index) {
    if (grid.length == 0) {
      return;
    }
    var grid_col = grid.length - 1;
    var ap = {};
    ap.node = grid[grid_col];
    ap.curr_node = ap.node;
    ap.ending_op = "";
    ap.next_inst_index = next_inst_index;
    var pend_count = ap.node.pending_instructions.length;
    for (var pend_index = 0;pend_index < pend_count;++pend_index) {
      var inst = ap.node.pending_instructions[pend_index];
      var is_last = pend_index == pend_count - 1;
      this.ap_one_instruction(inst, ap);
    }
    if (ap.ending_op != "hadamard") {
      if (this.use_alt_links) {
        ap.node.no_trailing_hadamard = true;
      } else {
        var in_between_index = .5 * (ap.node.inst_index + next_inst_index);
        var node2 = this.add_node(in_between_index, ap.node.qubit_index, null);
        node2.is_auto_added = true;
        this.add_link("rail", ap.node, node2);
      }
    }
  };
  this.add_error = function(qubits) {
    this.error = true;
    return true;
  };
  this.arrange_final_qubits = function(ignore_input) {
    var next_index = 0;
    this.input_nodes_bf = new BitField(0, this.nodes.length);
    this.output_nodes_bf = new BitField(0, this.nodes.length);
    this.work_nodes_bf = new BitField(0, this.nodes.length);
    var input_first = true;
    if (ignore_input) {
      input_first = false;
    }
    if (input_first) {
      for (var i = 0;i < this.node_grid.length;++i) {
        if (this.node_grid[i].length > 0) {
          var node = this.node_grid[i][0];
          node.final_qubit_index = next_index++;
          this.input_nodes_bf.setBit(node.final_qubit_index, 1);
        }
      }
    }
    for (var i = 0;i < this.node_grid.length;++i) {
      if (this.node_grid[i].length > 1) {
        var node = this.node_grid[i][this.node_grid[i].length - 1];
        node.final_qubit_index = next_index++;
        this.output_nodes_bf.setBit(node.final_qubit_index, 1);
      }
    }
    if (!input_first) {
      for (var i = 0;i < this.node_grid.length;++i) {
        if (this.node_grid[i].length > 0) {
          var node = this.node_grid[i][0];
          node.final_qubit_index = next_index++;
          this.input_nodes_bf.setBit(node.final_qubit_index, 1);
        }
      }
    }
    for (var i = 0;i < this.node_grid.length;++i) {
      for (var j = 1;j < this.node_grid[i].length - 1;++j) {
        var node = this.node_grid[i][j];
        node.final_qubit_index = next_index++;
        this.work_nodes_bf.setBit(node.final_qubit_index, 1);
      }
    }
  };
  this.convert_to_mbc = function(append_to_current, ignore_input) {
    this.arrange_final_qubits(ignore_input);
    if (!append_to_current) {
      this.overlay_visible = false;
    }
    var staff = this.staff;
    var qReg = this.qReg;
    var old_instructions = new Array;
    var old_numQubits = qReg.numQubits;
    var new_numQubits = this.nodes.length;
    for (var instIndex = 0;instIndex < staff.instructions.length;++instIndex) {
      old_instructions.push(staff.instructions[instIndex]);
    }
    if (old_numQubits < new_numQubits) {
      this.qReg.deactivate();
      this.qReg.removeAllQInts();
      this.qReg.setSize(new_numQubits);
      this.qReg.activate();
      this.qReg.staff.clear();
      if (append_to_current) {
        for (var instIndex = 0;instIndex < old_instructions.length;++instIndex) {
          staff.appendInstruction(old_instructions[instIndex]);
        }
      }
    } else {
      if (!append_to_current) {
        this.qReg.staff.clear();
      }
    }
    var code_label = "";
    var all_bits = this.qReg.allBitsMask;
    if (append_to_current) {
      staff.appendInstruction(new QInstruction("discard", all_bits, 0, 0, code_label));
      staff.appendInstruction(new QInstruction("nop", all_bits, 0, 0, code_label));
    }
    var new_targ = new BitField(0, this.qReg.numQubits);
    var new_cond = new BitField(0, this.qReg.numQubits);
    if (!ignore_input) {
      code_label = "pre";
      for (var i = 0;i < this.pre_instructions.length;++i) {
        var inst = this.pre_instructions[i];
        var op = inst.op;
        var targ = inst.targetQubits;
        var cond = inst.conditionQubits;
        var theta = inst.theta;
        if (inst.op == "write") {
          cond = inst.writeValue;
        }
        staff.appendInstruction(new QInstruction(op, targ, cond, theta, code_label));
      }
      var low_input = this.input_nodes_bf.getLowestBitIndex();
      if (low_input > 0) {
        var high_input = this.input_nodes_bf.getHighestBitIndex();
        new_targ.set(0);
        new_targ.setBit(high_input - low_input, 1);
        new_targ.setBit(high_input, 1);
        for (var j = high_input;j >= low_input;--j) {
          staff.appendInstruction(new QInstruction("exchange", new_targ, 0, 0, code_label));
          new_targ.shiftRight1();
        }
      }
    }
    code_label = "prep cluster";
    new_targ.set(0);
    new_targ.orEquals(this.work_nodes_bf);
    new_targ.orEquals(this.output_nodes_bf);
    if (ignore_input) {
      new_targ.orEquals(this.input_nodes_bf);
    }
    staff.appendInstruction(new QInstruction("write", new_targ, 0, 0, code_label));
    for (var node_index = 0;node_index < this.nodes.length;++node_index) {
      var node = this.nodes[node_index];
      if (node.no_trailing_hadamard) {
        new_targ.setBit(node.final_qubit_index, 0);
      }
    }
    staff.appendInstruction(new QInstruction("hadamard", new_targ, 0, 0, code_label));
    for (var pass = 0;pass < 2;++pass) {
      for (var link_index = 0;link_index < this.links.length;++link_index) {
        var link = this.links[link_index];
        var do_this_pass = true;
        if (link.type == "cz" && pass == 0) {
          do_this_pass = false;
        }
        if (link.type == "rail" && pass == 1) {
          do_this_pass = false;
        }
        if (do_this_pass) {
          if (link.type == "rail" && (link.node[0].no_trailing_hadamard || link.node[1].no_trailing_hadamard)) {
            var cond_bit = link.node[0].final_qubit_index;
            var targ_bit = link.node[1].final_qubit_index;
            if (link.node[0].no_trailing_hadamard) {
              cond_bit = link.node[1].final_qubit_index;
              targ_bit = link.node[0].final_qubit_index;
            }
            new_cond.set(0);
            new_cond.setBit(cond_bit, 1);
            new_targ.set(0);
            new_targ.setBit(targ_bit, 1);
            staff.appendInstruction(new QInstruction("cnot", new_targ, new_cond, 0, code_label));
          } else {
            var op = "phase";
            var theta = 180;
            new_cond.set(0);
            new_cond.setBit(link.node[0].final_qubit_index, 1);
            new_cond.setBit(link.node[1].final_qubit_index, 1);
            var new_inst = staff.appendInstruction(new QInstruction(op, null, new_cond, theta, code_label));
          }
        }
      }
    }
    code_label = "compute";
    for (var qubit_index = 0;qubit_index < this.node_grid.length;++qubit_index) {
      var grid = this.node_grid[qubit_index];
      for (var grid_col = 0;grid_col < grid.length;++grid_col) {
        var node = grid[grid_col];
        if (node.measurement_phase != 0) {
          new_targ.set(0);
          new_targ.setBit(node.final_qubit_index, 1);
          staff.appendInstruction(new QInstruction("phase", 0, new_targ, node.measurement_phase, code_label));
        }
      }
    }
    var had_targ = new BitField(0, qReg.numQubits);
    var ps_targ = new BitField(0, qReg.numQubits);
    had_targ.orEquals(this.input_nodes_bf);
    had_targ.orEquals(this.work_nodes_bf);
    ps_targ.orEquals(this.input_nodes_bf);
    ps_targ.orEquals(this.work_nodes_bf);
    staff.appendInstruction(new QInstruction("hadamard", had_targ, 0, 0, code_label));
    staff.appendInstruction(new QInstruction("postselect", ps_targ, 0, 0, code_label));
    code_label = "";
    var low_output = this.output_nodes_bf.getLowestBitIndex();
    if (low_output > 0) {
      var high_output = this.output_nodes_bf.getHighestBitIndex();
      new_targ.set(0);
      new_targ.setBit(0, 1);
      new_targ.setBit(low_output, 1);
      for (var j = low_output;j <= high_output;++j) {
        staff.appendInstruction(new QInstruction("exchange", new_targ, 0, 0, code_label));
        new_targ.shiftLeft1();
      }
      staff.appendInstruction(new QInstruction("nop", 0, 0, 0, code_label));
    }
    staff.fullSnapshot();
  };
  this.debug_print = function(message) {
    var str = "";
    if (message) {
      str += message;
    }
    str += "measurement-based computation state: \n";
    console.log(str);
    console.log("There are " + this.nodes.length + " nodes and " + this.links.length + " links.");
  };
  this.draw_staff_overlay = function(ctx) {
    if (!this.overlay_visible) {
      return;
    }
    if (!this.nodes || !this.nodes.length) {
      return;
    }
    var gs = this.staff.gridSize;
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#06f";
    ctx.fillStyle = "white";
    ctx.globalAlpha = .75;
    var xmin = this.nodes[0].inst_index;
    var ymin = this.nodes[0].qubit_index;
    var xmax = this.nodes[0].inst_index;
    var ymax = this.nodes[0].qubit_index;
    for (var node_index = 1;node_index < this.nodes.length;++node_index) {
      xmin = Math.min(xmin, this.nodes[node_index].inst_index);
      ymin = Math.min(ymin, this.nodes[node_index].qubit_index);
      xmax = Math.max(xmax, this.nodes[node_index].inst_index);
      ymax = Math.max(ymax, this.nodes[node_index].qubit_index);
    }
    var x1 = gs * (xmin - .5);
    var y1 = gs * (ymin - .5);
    var x2 = gs * (xmax - xmin + 1);
    var y2 = gs * (ymax - ymin + 1);
    ctx.fillRect(x1, y1, x2, y2);
    ctx.globalAlpha = 1.05;
    ctx.strokeRect(x1, y1, x2, y2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#00f";
    for (var link_index = 0;link_index < this.links.length;++link_index) {
      ctx.beginPath();
      var link = this.links[link_index];
      var x1 = gs * link.node[0].inst_index;
      var y1 = gs * link.node[0].qubit_index;
      var x2 = gs * link.node[1].inst_index;
      var y2 = gs * link.node[1].qubit_index;
      var radius = gs * .2;
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.lineWidth = 2;
    for (var node_index = 0;node_index < this.nodes.length;++node_index) {
      var node = this.nodes[node_index];
      if (node.is_auto_added) {
        ctx.strokeStyle = "#06f";
        ctx.fillStyle = "#6fa";
      } else {
        ctx.strokeStyle = "#06f";
        ctx.fillStyle = "#6af";
      }
      var x = gs * node.inst_index;
      var y = gs * node.qubit_index;
      var radius = gs * .2;
      fillCircle(ctx, x, y, radius);
      strokeCircle(ctx, x, y, radius);
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#f22";
    for (var qubit_index = 0;qubit_index < this.node_grid.length;++qubit_index) {
      var grid = this.node_grid[qubit_index];
      if (grid.length) {
        var node = grid[grid.length - 1];
        var x = gs * node.inst_index;
        var y = gs * node.qubit_index;
        var radius = gs * .5;
        strokeCircle(ctx, x, y, radius);
      }
    }
    ctx.restore();
  };
}
;var have_liquid_emulator = true;
function LiquidTimer() {
  var header1 = "0:0.0/ Secs              Mem(GB) Operation";
  var header2 = "0:0.0/ -------  -------  ------- ---------";
  qc.print(header1 + "\n" + header2 + "\n");
  console.log(header1 + "\n" + header2);
  this.Show = function(message) {
    var end_time = (new Date).getTime();
    var total_elapsed_time_minutes = (end_time - this.init_time) / (60 * 1E3);
    var elapsed_time = (end_time - this.start_time) / 1E3;
    var GiB = qc.qReg.bytesRequired() / (1024 * 1024 * 1024);
    var str = "";
    str += "0:";
    str += total_elapsed_time_minutes.toFixed(1) + "/ ";
    str += elapsed_time.toFixed(3) + " ";
    str += "         ";
    str += "   ";
    str += GiB.toFixed(3) + "   ";
    str += message;
    qc.print(str + "\n");
    console.log(str);
    this.start_time = (new Date).getTime();
  };
  this.start_time = this.init_time = (new Date).getTime();
}
function LiquidEmulator() {
  this.verbose = false;
  this.is_sim_disabled = function() {
    if (qc.qReg.disableSimulation) {
      var str = "This sim has " + qc.qReg.numQubits + " qubits, " + "which would require " + (Math.pow(2, qc.qReg.numQubits + 3) / (1024 * 1024 * 1024)).toFixed(1) + " GB, so it's running in digital-only mode, and entanglement won't work.";
      qc.print(str);
      console.log(str);
      return true;
    }
  };
  this.__Entangle1 = function(num_qubits) {
    qc.reset(num_qubits);
    if (this.is_sim_disabled()) {
      return;
    }
    var qt = new LiquidTimer(this);
    qc.hadamard(1);
    if (this.verbose) {
      qt.Show("Did Hadamard");
    }
    for (var i = 1;i < num_qubits;++i) {
      qc.cnot(1 << i, 1);
      if (this.verbose) {
        qt.Show("Did CNOT: " + i);
      }
    }
    qc.read();
    if (this.verbose) {
      qt.Show("Did Read");
    }
  };
  this.__Entangle2 = function(num_qubits) {
    qc.reset(num_qubits);
    if (this.is_sim_disabled()) {
      return;
    }
    var qt = new LiquidTimer(this);
    qc.hadamard(1);
    for (var i = 1;i < num_qubits;++i) {
      qc.cnot(1 << i, 1);
    }
    qc.read();
    qt.Show("Straight function calls");
  };
  this.__Entangles = function() {
    var num_qubits = 16;
    var num_iters = 100;
    qc.reset(num_qubits);
    var qt = new LiquidTimer(this);
    for (var iter = 0;iter < num_iters;++iter) {
      qc.write(0);
      qc.hadamard(1);
      for (var i = 1;i < num_qubits;++i) {
        qc.cnot(1 << i, 1);
      }
      var result = qc.read();
      if (this.verbose) {
        if (result == 0) {
          result = "0000000000000000";
        } else {
          if (result == 65535) {
            result = "1111111111111111";
          }
        }
        qt.Show("#### Iter " + iter + ": " + result);
      }
    }
  };
  this.EPR = function(qs) {
    qs[0].hadamard();
    qs[1].cnot(qs[0]);
  };
  this.teleport = function(q0, q1, q2) {
    this.EPR([q1, q2]);
    q1.cnot(q0);
    q0.hadamard();
    var bits = qc.read(1 | 2);
    q2.cnot(q1);
    q2.cz(q0);
    return bits;
  };
  this.randomPlusMinus = function() {
    return Math.random() * 2 - 1;
  };
  this.teleportRun = function(cnt) {
    qc.print("============ TELEPORT =============\n");
    for (var i = 0;i < cnt;++i) {
      qc.codeLabel("");
      var rVal = this.randomPlusMinus;
      qc.reset(3);
      qc.write(0);
      var q0 = qint["new"](1, "Src");
      var q1 = qint["new"](1, "|0>");
      var q2 = qint["new"](1, "Dest");
      qc.codeLabel("rand");
      qc.qReg.pokeComplexValue(0, rVal(), rVal());
      qc.qReg.pokeComplexValue(1, rVal(), rVal());
      qc.qReg.renormalize();
      q0.rotx(180 * rVal());
      q0.rotz(180 * rVal());
      var v0 = qc.qReg.peekComplexValue(0);
      var v1 = qc.qReg.peekComplexValue(1);
      qc.print("Initial State: " + "(" + v0.x.toFixed(4) + "+" + v0.y.toFixed(4) + "i)|0>+" + "(" + v1.x.toFixed(4) + "+" + v1.y.toFixed(4) + "i)|1>\n");
      qc.codeLabel("teleport");
      var bits = this.teleport(q0, q1, q2);
      var v0 = qc.qReg.peekComplexValue(bits | 0);
      var v1 = qc.qReg.peekComplexValue(bits | 4);
      qc.print("Final State:   " + "(" + v0.x.toFixed(4) + "+" + v0.y.toFixed(4) + "i)|0>+" + "(" + v1.x.toFixed(4) + "+" + v1.y.toFixed(4) + "i)|1> " + "(bits:" + (bits >> 1 & 1) + (bits & 1) + ")\n");
    }
    qc.print("==================================\n");
  };
  this.__Teleport = function() {
    this.teleportRun(10);
  };
}
;function CHPSimulator() {
  var CNOT = 0;
  var HADAMARD = 1;
  var PHASE = 2;
  var MEASURE = 3;
  this.active = false;
  this.verbose = false;
  this.reset = function(qReg, targetQubits, this_instruction) {
    this.qReg = qReg;
    qc.start();
    if (qc) {
      qc.chp = this;
      if (qReg == null) {
        qReg = qc.qReg;
      }
    }
    if (qReg) {
      qReg.chp = this;
      var q = {};
      this.qstate = q;
      this.initstae_(q, qReg.numQubits);
      if (this.verbose) {
        this.printket(q);
        this.printstate(q);
      }
    }
  };
  this.cnot = function(q, b, c) {
    if (q == null) {
      q = this.qstate;
    }
    var i;
    var b5;
    var c5;
    var pwb;
    var pwc;
    b5 = b >> 5;
    c5 = c >> 5;
    pwb = q.pw[b & 31];
    pwc = q.pw[c & 31];
    for (i = 0;i < 2 * q.n;i++) {
      if (q.x[i][b5] & pwb) {
        q.x[i][c5] ^= pwc;
      }
      if (q.z[i][c5] & pwc) {
        q.z[i][b5] ^= pwb;
      }
      if (q.x[i][b5] & pwb && q.z[i][c5] & pwc && q.x[i][c5] & pwc && q.z[i][b5] & pwb) {
        q.r[i] = (q.r[i] + 2) % 4;
      }
      if (q.x[i][b5] & pwb && q.z[i][c5] & pwc && !(q.x[i][c5] & pwc) && !(q.z[i][b5] & pwb)) {
        q.r[i] = (q.r[i] + 2) % 4;
      }
    }
    if (this.verbose) {
      this.printket(q, "after CNOT:");
      this.printstate(q);
    }
    return;
  };
  this.hadamard = function(q, b) {
    if (q == null) {
      q = this.qstate;
    }
    var i;
    var tmp;
    var b5;
    var pw;
    b5 = b >> 5;
    pw = q.pw[b & 31];
    for (i = 0;i < 2 * q.n;i++) {
      tmp = q.x[i][b5];
      q.x[i][b5] ^= (q.x[i][b5] ^ q.z[i][b5]) & pw;
      q.z[i][b5] ^= (q.z[i][b5] ^ tmp) & pw;
      if (q.x[i][b5] & pw && q.z[i][b5] & pw) {
        q.r[i] = (q.r[i] + 2) % 4;
      }
    }
    if (this.verbose) {
      this.printket(q, "after HAD:");
      this.printstate(q);
    }
    return;
  };
  this.phase = function(q, b) {
    if (q == null) {
      q = this.qstate;
    }
    var i;
    var b5;
    var pw;
    b5 = b >> 5;
    pw = q.pw[b & 31];
    for (i = 0;i < 2 * q.n;i++) {
      if (q.x[i][b5] & pw && q.z[i][b5] & pw) {
        q.r[i] = (q.r[i] + 2) % 4;
      }
      q.z[i][b5] ^= q.x[i][b5] & pw;
    }
    if (this.verbose) {
      this.printket(q, "after PHASE:");
      this.printstate(q);
    }
    return;
  };
  this.rowcopy = function(q, i, k) {
    var j;
    for (j = 0;j < q.over32;j++) {
      q.x[i][j] = q.x[k][j];
      q.z[i][j] = q.z[k][j];
    }
    q.r[i] = q.r[k];
    return;
  };
  this.rowswap = function(q, i, k) {
    this.rowcopy(q, 2 * q.n, k);
    this.rowcopy(q, k, i);
    this.rowcopy(q, i, 2 * q.n);
    return;
  };
  this.rowset = function(q, i, b) {
    var j;
    var b5;
    var b31;
    for (j = 0;j < q.over32;j++) {
      q.x[i][j] = 0;
      q.z[i][j] = 0;
    }
    q.r[i] = 0;
    if (b < q.n) {
      b5 = b >> 5;
      b31 = b & 31;
      q.x[i][b5] = q.pw[b31];
    } else {
      b5 = b - q.n >> 5;
      b31 = b - q.n & 31;
      q.z[i][b5] = q.pw[b31];
    }
    return;
  };
  this.clifford = function(q, i, k) {
    var j;
    var l;
    var pw;
    var e = 0;
    for (j = 0;j < q.over32;j++) {
      for (l = 0;l < 32;l++) {
        pw = q.pw[l];
        if (q.x[k][j] & pw && !(q.z[k][j] & pw)) {
          if (q.x[i][j] & pw && q.z[i][j] & pw) {
            e++;
          }
          if (!(q.x[i][j] & pw) && q.z[i][j] & pw) {
            e--;
          }
        }
        if (q.x[k][j] & pw && q.z[k][j] & pw) {
          if (!(q.x[i][j] & pw) && q.z[i][j] & pw) {
            e++;
          }
          if (q.x[i][j] & pw && !(q.z[i][j] & pw)) {
            e--;
          }
        }
        if (!(q.x[k][j] & pw) && q.z[k][j] & pw) {
          if (q.x[i][j] & pw && !(q.z[i][j] & pw)) {
            e++;
          }
          if (q.x[i][j] & pw && q.z[i][j] & pw) {
            e--;
          }
        }
      }
    }
    e = (e + q.r[i] + q.r[k]) % 4;
    if (e >= 0) {
      return e;
    } else {
      return e + 4;
    }
  };
  this.rowmult = function(q, i, k) {
    var j;
    q.r[i] = this.clifford(q, i, k);
    for (j = 0;j < q.over32;j++) {
      q.x[i][j] ^= q.x[k][j];
      q.z[i][j] ^= q.z[k][j];
    }
    return;
  };
  this.printstate = function(q) {
    if (q == null) {
      q = this.qstate;
    }
    var i;
    var j;
    var j5;
    var pw;
    for (i = 0;i < 2 * q.n;i++) {
      if (i == q.n) {
        this.print("\n");
        for (j = 0;j < q.n + 1;j++) {
          this.print("-");
        }
      }
      if (q.r[i] == 2) {
        this.print("\n-");
      } else {
        this.print("\n+");
      }
      for (j = 0;j < q.n;j++) {
        j5 = j >> 5;
        pw = q.pw[j & 31];
        if (!(q.x[i][j5] & pw) && !(q.z[i][j5] & pw)) {
          this.print("I");
        }
        if (q.x[i][j5] & pw && !(q.z[i][j5] & pw)) {
          this.print("X");
        }
        if (q.x[i][j5] & pw && q.z[i][j5] & pw) {
          this.print("Y");
        }
        if (!(q.x[i][j5] & pw) && q.z[i][j5] & pw) {
          this.print("Z");
        }
      }
    }
    this.print("\n");
    return;
  };
  this.measure = function(q, b, sup) {
    if (q == null) {
      q = this.qstate;
    }
    var ran = 0;
    var i;
    var p;
    var m;
    var b5;
    var pw;
    b5 = b >> 5;
    pw = q.pw[b & 31];
    for (p = 0;p < q.n;p++) {
      if (q.x[p + q.n][b5] & pw) {
        ran = 1;
      }
      if (ran) {
        break;
      }
    }
    if (ran) {
      var random_bit = 0 | Math.floor(Math.random() * 2);
      this.rowcopy(q, p, p + q.n);
      this.rowset(q, p + q.n, b + q.n);
      q.r[p + q.n] = random_bit << 1;
      for (i = 0;i < 2 * q.n;i++) {
        if (i != p && q.x[i][b5] & pw) {
          this.rowmult(q, i, p);
        }
      }
      if (q.r[p + q.n]) {
        return 3;
      } else {
        return 2;
      }
    }
    if (!ran && !sup) {
      for (m = 0;m < q.n;m++) {
        if (q.x[m][b5] & pw) {
          break;
        }
      }
      this.rowcopy(q, 2 * q.n, m + q.n);
      for (i = m + 1;i < q.n;i++) {
        if (q.x[i][b5] & pw) {
          this.rowmult(q, 2 * q.n, i + q.n);
        }
      }
      if (q.r[2 * q.n]) {
        return 1;
      } else {
        return 0;
      }
    }
    return 0;
  };
  this.gaussian = function(q) {
    if (q == null) {
      q = this.qstate;
    }
    var i = q.n;
    var k;
    var k2;
    var j;
    var j5;
    var g;
    var pw;
    for (j = 0;j < q.n;j++) {
      j5 = j >> 5;
      pw = q.pw[j & 31];
      for (k = i;k < 2 * q.n;k++) {
        if (q.x[k][j5] & pw) {
          break;
        }
      }
      if (k < 2 * q.n) {
        this.rowswap(q, i, k);
        this.rowswap(q, i - q.n, k - q.n);
        for (k2 = i + 1;k2 < 2 * q.n;k2++) {
          if (q.x[k2][j5] & pw) {
            this.rowmult(q, k2, i);
            this.rowmult(q, i - q.n, k2 - q.n);
          }
        }
        i++;
      }
    }
    g = i - q.n;
    for (j = 0;j < q.n;j++) {
      j5 = j >> 5;
      pw = q.pw[j & 31];
      for (k = i;k < 2 * q.n;k++) {
        if (q.z[k][j5] & pw) {
          break;
        }
      }
      if (k < 2 * q.n) {
        this.rowswap(q, i, k);
        this.rowswap(q, i - q.n, k - q.n);
        for (k2 = i + 1;k2 < 2 * q.n;k2++) {
          if (q.z[k2][j5] & pw) {
            this.rowmult(q, k2, i);
            this.rowmult(q, i - q.n, k2 - q.n);
          }
        }
        i++;
      }
    }
    return g;
  };
  this.innerprod = function(q1, q2) {
    return 0;
  };
  this.printbasisstate = function(q) {
    if (q == null) {
      q = this.qstate;
    }
    var j;
    var j5;
    var pw;
    var e = q.r[2 * q.n];
    for (j = 0;j < q.n;j++) {
      j5 = j >> 5;
      pw = q.pw[j & 31];
      if (q.x[2 * q.n][j5] & pw && q.z[2 * q.n][j5] & pw) {
        e = (e + 1) % 4;
      }
    }
    if (e == 0) {
      this.print("\n +|");
    }
    if (e == 1) {
      this.print("\n+i|");
    }
    if (e == 2) {
      this.print("\n -|");
    }
    if (e == 3) {
      this.print("\n-i|");
    }
    for (j = 0;j < q.n;j++) {
      j5 = j >> 5;
      pw = q.pw[j & 31];
      if (q.x[2 * q.n][j5] & pw) {
        this.print("1");
      } else {
        this.print("0");
      }
    }
    this.print(">");
    return;
  };
  this.seed = function(q, g) {
    var i;
    var j;
    var j5;
    var pw;
    var f;
    var min;
    q.r[2 * q.n] = 0;
    for (j = 0;j < q.over32;j++) {
      q.x[2 * q.n][j] = 0;
      q.z[2 * q.n][j] = 0;
    }
    for (i = 2 * q.n - 1;i >= q.n + g;i--) {
      f = q.r[i];
      for (j = q.n - 1;j >= 0;j--) {
        j5 = j >> 5;
        pw = q.pw[j & 31];
        if (q.z[i][j5] & pw) {
          min = j;
          if (q.x[2 * q.n][j5] & pw) {
            f = (f + 2) % 4;
          }
        }
      }
      if (f == 2) {
        j5 = min >> 5;
        pw = q.pw[min & 31];
        q.x[2 * q.n][j5] ^= pw;
      }
    }
    return;
  };
  this.printket = function(q, message) {
    if (q == null) {
      q = this.qstate;
    }
    var g;
    var t;
    var t2;
    var i;
    if (message) {
      this.print(message);
    }
    g = this.gaussian(q);
    this.print("\n2^" + g + " nonzero basis states");
    if (g > 31) {
      this.print("\nState is WAY too big to print");
      return;
    }
    this.seed(q, g);
    this.printbasisstate(q);
    for (t = 0;t < q.pw[g] - 1;t++) {
      t2 = t ^ t + 1;
      for (i = 0;i < g;i++) {
        if (t2 & q.pw[i]) {
          this.rowmult(q, 2 * q.n, q.n + i);
        }
      }
      this.printbasisstate(q);
    }
    this.print("\n");
    return;
  };
  this.runprog = function(q, h) {
    if (q == null) {
      q = this.qstate;
    }
    var t;
    var m;
    var tp;
    var dt;
    var mvirgin = 1;
    tp = (new Date).getTime();
    for (t = 0;t < h.T;t++) {
      if (h.a[t] == CNOT) {
        this.cnot(q, h.b[t], h.c[t]);
      }
      if (h.a[t] == HADAMARD) {
        this.hadamard(q, h.b[t]);
      }
      if (h.a[t] == PHASE) {
        this.phase(q, h.b[t]);
      }
      if (h.a[t] == MEASURE) {
        if (mvirgin && h.DISPTIME) {
          dt = (new Date).getTime() - tp;
          this.print("\nGate time: " + dt + " seconds");
          this.print("\nTime per 10000 gates: " + dt * 1E4 / (h.T - h.n) + " seconds");
          tp = (new Date).getTime();
        }
        mvirgin = 0;
        m = this.measure(q, h.b[t], h.SUPPRESSM);
        if (!h.SILENT) {
          this.print("\nOutcome of measuring qubit " + h.b[t] + ": ");
          if (m > 1) {
            this.print("" + (m - 2) + " (random)");
          } else {
            this.print("" + m);
          }
        }
      }
      if (h.DISPPROG) {
        if (h.a[t] == CNOT) {
          this.print("\nCNOT " + h.b[t] + "->" + h.c[t] + "");
        }
        if (h.a[t] == HADAMARD) {
          this.print("\nHadamard " + h.b[t] + "");
        }
        if (h.a[t] == PHASE) {
          this.print("\nPhase " + h.b[t] + "");
        }
      }
    }
    this.print("\n");
    if (h.DISPTIME) {
      dt = (new Date).getTime() - tp;
      this.print("\nMeasurement time: " + dt + " seconds");
      this.print("\nTime per 10000 measurements: " + dt * 1E4 / h.n + " seconds\n");
    }
    if (h.DISPQSTATE) {
      printf("\nFinal state:");
      this.printstate(q);
      this.gaussian(q);
      this.printstate(q);
      this.printket(q);
    }
    return;
  };
  this.preparestate = function(q, s) {
    var b;
    for (b = 0;b < s.length;b++) {
      if (s[b] == "Z") {
        this.hadamard(q, b);
        this.phase(q, b);
        this.phase(q, b);
        this.hadamard(q, b);
      }
      if (s[b] == "x") {
        hadamard(q, b);
      }
      if (s[b] == "X") {
        this.hadamard(q, b);
        this.phase(q, b);
        this.phase(q, b);
      }
      this["if"](s[b] == "y");
      this.hadamard(q, b);
      this.phase(q, b);
      if (s[b] == "Y") {
        this.hadamard(q, b);
        this.phase(q, b);
        this.phase(q, b);
        this.phase(q, b);
      }
    }
    return;
  };
  this.print = function(str) {
    qc.print(str);
  };
  this.malloc_char = function(count) {
    var bytes_per_item = 1;
    return new Int8Array(new ArrayBuffer(count * bytes_per_item));
  };
  this.malloc_long = function(count) {
    var bytes_per_item = 4;
    return new Int32Array(new ArrayBuffer(count * bytes_per_item));
  };
  this.malloc_unsigned_long = function(count) {
    var bytes_per_item = 4;
    return new Uint32Array(new ArrayBuffer(count * bytes_per_item));
  };
  this.malloc_int = function(count) {
    var bytes_per_item = 4;
    return new Int32Array(new ArrayBuffer(count * bytes_per_item));
  };
  this.initstae_ = function(q, n, s) {
    var i;
    var j;
    q.n = n;
    q.x = new Array(2 * q.n + 1);
    q.z = new Array(2 * q.n + 1);
    q.r = this.malloc_int(2 * q.n + 1);
    q.over32 = (q.n >> 5) + 1;
    q.pw = this.malloc_unsigned_long(32);
    q.pw[0] = 1;
    for (i = 1;i < 32;i++) {
      q.pw[i] = 2 * q.pw[i - 1];
    }
    for (i = 0;i < 2 * q.n + 1;i++) {
      q.x[i] = this.malloc_unsigned_long(q.over32);
      q.z[i] = this.malloc_unsigned_long(q.over32);
      for (j = 0;j < q.over32;j++) {
        q.x[i][j] = 0;
        q.z[i][j] = 0;
      }
      if (i < q.n) {
        q.x[i][i >> 5] = q.pw[i & 31];
      } else {
        if (i < 2 * q.n) {
          j = i - q.n;
          q.z[i][j >> 5] = q.pw[j & 31];
        }
      }
      q.r[i] = 0;
    }
    if (this.verbose) {
      this.printket(q, "after init:");
      this.printstate(q);
    }
    if (s) {
      this.preparestate(q, s);
    }
    if (this.verbose) {
      this.printket(q, "after prepare:");
      this.printstate(q);
    }
    return;
  };
  this.parseprog = function(h, program, params) {
    var t;
    var fn2;
    var c = 0;
    var val;
    h.DISPQSTATE = 0;
    h.DISPTIME = 0;
    h.SILENT = 0;
    h.DISPPROG = 0;
    h.SUPPRESSM = 0;
    if (params) {
      for (t = 1;t < params.length;t++) {
        if (params[t] == "q" || params[t] == "Q") {
          h.DISPQSTATE = 1;
        }
        if (params[t] == "p" || params[t] == "P") {
          h.DISPPROG = 1;
        }
        if (params[t] == "t" || params[t] == "T") {
          h.DISPTIME = 1;
        }
        if (params[t] == "s" || params[t] == "S") {
          h.SILENT = 1;
        }
        if (params[t] == "m" || params[t] == "M") {
          h.SUPPRESSM = 1;
        }
      }
    }
    var line = 0;
    while (line < program.length && program[line] != "#") {
      ++line;
    }
    if (line >= program.length) {
      this.print("Error: empty program, no # found.\n");
      return;
    }
    var first_line = line + 1;
    line = first_line;
    h.T = 0;
    h.n = 0;
    while (line < program.length) {
      var tokens = program[line].split(" ");
      if (tokens.length >= 2) {
        var c = tokens[0][0];
        var val = parseInt(tokens[1]);
        if (val + 1 > h.n) {
          h.n = val + 1;
        }
        if (c == "c" || c == "C") {
          val = parseInt(tokens[2]);
          if (val + 1 > h.n) {
            h.n = val + 1;
          }
        }
        h.T++;
      }
      line++;
    }
    h.a = this.malloc_char(h.T);
    h.b = this.malloc_long(h.T);
    h.c = this.malloc_long(h.T);
    line = first_line;
    t = 0;
    while (line < program.length) {
      var tokens = program[line].split(" ");
      if (tokens.length >= 2) {
        var c = tokens[0][0];
        h.b[t] = parseInt(tokens[1]);
        if (c == "c" || c == "C") {
          h.a[t] = CNOT;
        }
        if (c == "h" || c == "H") {
          h.a[t] = HADAMARD;
        }
        if (c == "p" || c == "P") {
          h.a[t] = PHASE;
        }
        if (c == "m" || c == "M") {
          h.a[t] = MEASURE;
        }
        if (h.a[t] == CNOT) {
          h.c[t] = parseInt(tokens[2]);
        } else {
          h.c[t] = 0;
        }
        t++;
      }
      line++;
    }
    return;
  };
  this.print_program = function(qprog) {
    this.print("program:");
    var num_qubits = qprog.n;
    var num_instructions = qprog.T;
    var target = new BitField(0, num_qubits);
    var cond = new BitField(0, num_qubits);
    for (var i = 0;i < num_instructions;++i) {
      var inst = qprog.a[i];
      var a_bit = qprog.b[i];
      var b_bit = qprog.c[i];
      if (inst == CNOT) {
        this.print("  CNOT " + a_bit + " " + b_bit);
      } else {
        if (inst == HADAMARD) {
          this.print("  HAD  " + a_bit);
        } else {
          if (inst == PHASE) {
            this.print("  PH   " + a_bit);
          } else {
            if (inst == MEASURE) {
              this.print("  MEAS " + a_bit);
            }
          }
        }
      }
    }
  };
  this.convert_chp_program_to_qcengine = function(qprog) {
    var num_qubits = qprog.n;
    var num_instructions = qprog.T;
    var a_bf = new BitField(0, num_qubits);
    var b_bf = new BitField(0, num_qubits);
    if (qc.qReg.numQubits < num_qubits) {
      qc.reset(num_qubits);
    }
    for (var i = 0;i < num_qubits;++i) {
      a_bf.setBit(i, 1);
    }
    qc.write(0, a_bf);
    for (var i = 0;i < num_instructions;++i) {
      var inst = qprog.a[i];
      var a_bit = qprog.b[i];
      var b_bit = qprog.c[i];
      a_bf.set(0);
      a_bf.setBit(a_bit, 1);
      if (inst == CNOT) {
        b_bf.set(0);
        b_bf.setBit(b_bit, 1);
        qc.cnot(b_bf, a_bf);
      } else {
        if (inst == HADAMARD) {
          qc.hadamard(a_bf);
        } else {
          if (inst == PHASE) {
            qc.phase(90, a_bf);
          } else {
            if (inst == MEASURE) {
              qc.read(a_bf);
            }
          }
        }
      }
    }
    a_bf.recycle();
    b_bf.recycle();
  };
  this.parse_chp_commands = function(program_str) {
    this.qprog = {};
    this.parseprog(this.qprog, program_str, "");
    this.print_program(this.qprog);
    this.convert_chp_program_to_qcengine(this.qprog);
  };
  this.transferLogicalToCHP = function() {
    this.reset(this.qReg);
  };
  this.transferBasisStateToLogical = function(q) {
    var j;
    var j5;
    var pw;
    var e = q.r[2 * q.n];
    for (j = 0;j < q.n;j++) {
      j5 = j >> 5;
      pw = q.pw[j & 31];
      if (q.x[2 * q.n][j5] & pw && q.z[2 * q.n][j5] & pw) {
        e = (e + 1) % 4;
      }
    }
    var real = 0;
    var imag = 0;
    if (e == 0) {
      real = 1;
    } else {
      if (e == 1) {
        imag = 1;
      } else {
        if (e == 2) {
          real = -1;
        } else {
          if (e == 3) {
            imag = -1;
          }
        }
      }
    }
    var logical_value = 0;
    for (j = 0;j < q.n;j++) {
      j5 = j >> 5;
      pw = q.pw[j & 31];
      if (q.x[2 * q.n][j5] & pw) {
        logical_value |= 1 << j;
      }
    }
    this.qReg.pokeComplexValue(logical_value, real, imag);
  };
  this.transferCHPToLogical = function() {
    this.qReg.setZero();
    q = this.qstate;
    var g;
    var t;
    var t2;
    var i;
    g = this.gaussian(q);
    if (g > 31) {
      this.print("\nState is WAY too big to transfer.");
      return;
    }
    this.seed(q, g);
    this.transferBasisStateToLogical(q);
    for (t = 0;t < q.pw[g] - 1;t++) {
      t2 = t ^ t + 1;
      for (i = 0;i < g;i++) {
        if (t2 & q.pw[i]) {
          this.rowmult(q, 2 * q.n, q.n + i);
        }
      }
      this.transferBasisStateToLogical(q);
    }
    this.qReg.renormalize();
    this.qReg.changed();
  };
}
;