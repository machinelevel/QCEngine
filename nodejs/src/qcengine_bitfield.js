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


function getLowestBitIndex(bf)
{
  validate_bitfield(bf);
  var low_index = -1;
  // WARNING: There's a JS subtlety here, dealing with BigInt,
  //          negative numbers, and >>= vs >>>=
  while (bf)
  {
      low_index++;
      if (bf & bitfield_one)
          return low_index;
      if (bf < bitfield_zero)
          bf >>>= bitfield_one;
      else
          bf >>= bitfield_one;
  }
  return -1;
}

function getHighestBitIndex(bf)
{
  validate_bitfield(bf);
  var high_index = -1;
  // WARNING: There's a JS subtlety here, dealing with BigInt,
  //          negative numbers, and >>= vs >>>=
  while (bf)
  {
      high_index++;
      if (bf < bitfield_zero)
          bf >>>= bitfield_one;
      else
          bf >>= bitfield_one;
  }
  return high_index;
}

// Check a bitfield or an int for all-zero
function getBit(bf, bit_index)
{
  if (!bf)
    return 0;
  validate_bitfield(bf);

  if (is_bitfield(bf))
  {
    var result = (bf >> bitfield_type(bit_index)) & bitfield_one;
    validate_bitfield(result);
    return result;
  }
  return (bf >>> bit_index) & 1;
}


// Return an array with the indices of all 1 bits in the field
function makeBitArray(bf, max_length)
{
  bf = to_bitfield(bf);
  var result = [];

  if (bf)
  {
    var mask = bitfield_one;
    for (var i = 0; mask <= bf && result.length < max_length; ++i)
    {
      if (bf & mask)
        result.push(i);
      mask <<= bitfield_one;
    }
  }
  return result;
}


function newShiftedMask(mask, shift)
{
  var result = bitfield_type(mask) << bitfield_type(shift)
  validate_bitfield(result);
  return result;
}

// Create a mask of all 1 bits, shifted up
function newShiftedOnesMask(mask_num_bits, shift)
{
  var result = ((bitfield_one << bitfield_type(mask_num_bits)) - bitfield_one) << bitfield_type(shift);
  validate_bitfield(result);
  return result;
}

function bitfieldHexString(bitField)
{
  return bitField.toString(16);
}

function validate_bitfield(bf)
{
  if (qc_options.debug_mode)
  {
    if (bf < bitfield_zero)
      crash_here();
  }
}

function countOneBits(bf)
{
  validate_bitfield(bf);
  var total = 0;

  // WARNING: There's a JS subtlety here, dealing with BigInt,
  //          negative numbers, and >>= vs >>>=
  while (bf)
  {
      if (bf & bitfield_one)
          total++;
      if (bf < bitfield_zero)
          bf >>>= bitfield_one;
      else
          bf >>= bitfield_one;
  }
  return total;
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
    var old_bf = bf;
    for (var i = 0; i < this.numBits; ++i)
    {
      if (this.table[i] != i)
      {
        setBit(bf, i, getBit(old_bf, this.table[i]));
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

function bit_indices_to_mask(list_of_bit_indices)
{
    // There are too many bits for a JS integer, so this must become a bitfield.
    bf = bitfield_zero;
    for (var i = 0; i < list_of_bit_indices.length; ++i)
        bf |= bitfield_type(list_of_bit_indices[i]) << bitfield_one;
    return bf;
}

function mask_as_hex(mask)
{
    return '0x' + mask.toString(16);
}

function mask_as_binary(mask)
{
    return '0b' + mask.toString(2);
}

function mask_roll_left(mask, roll_dist, mask_size)
{
  validate_bitfield(mask);
  mask_size = bitfield_type(mask_size);
  roll_dist = bitfield_type(roll_dist);
  var cover_mask = (bitfield_one << bitfield_type(mask_size)) - bitfield_one;

  var result = ((mask << roll_dist) | (mask >> (mask_size - roll_dist))) & cover_mask;
  validate_bitfield(result);
  return result;
}

function mask_roll_right(mask, roll_dist, mask_size)
{
  validate_bitfield(mask);
  mask_size = bitfield_type(mask_size);
  roll_dist = bitfield_type(roll_dist);
  var cover_mask = (bitfield_one << bitfield_type(mask_size)) - bitfield_one;

  var result = ((mask >> roll_dist) | (mask << (mask_size - roll_dist))) & cover_mask;
  validate_bitfield(result);
  return result;
}

bitfield_type      = Number;
bitfield_typestr   = 'number';
bitfield_one       = 1;
bitfield_zero      = 0;
//bitfield_sign_mask = 0x7fffffff;

function setup_bitfields(max_qubits)
{
  const max_integer_bits = 31;

  if (max_qubits > max_integer_bits)
  {
    // Switchable types
    bitfield_type    = BigInt;
    bitfield_typestr = 'bigint';
  }
  else
  {
    // Switchable types
    bitfield_type    = Number;
    bitfield_typestr = 'number';
  }
  bitfield_zero = bitfield_type(0);
  bitfield_one  = bitfield_type(1);
//  bitfield_sign_mask = (bitfield_one << max_qubits) - bitfield_one;
}

function list_to_mask(num)
{
  // If this is a list, construct a mask from it
  if (Array.isArray(num))
  {
      var mask = bitfield_zero;
      for (var i = 0; i < num.length; ++i)
          mask |= bitfield_one << to_bitfield(num[i]);
      return mask;
  }
  return num;
}

function to_bitfield(num)
{
  num = list_to_mask(num);
  if (num == null)
    return null;
  var result = bitfield_type(num);
  // TODO: This shoult be fixed if JS BigInt can return negative numbers
  if (result < bitfield_zero)
    result = bitfield_type(0x7fffffff);
  validate_bitfield(result);
  return result;
}

function bf_shift(val, shift)
{
  var result = to_bitfield(val) << to_bitfield(shift);
  validate_bitfield(result);
  return result;
}

function to_number(num)
{
  if (num == null)
    return null;
  return Number(num);
}

function is_bitfield(num)
{
  var result = typeof(num) === bitfield_typestr;
  if (result)
    validate_bitfield(num);
  return result;
}

// Node.js glue: this line is needed to make the Node.js exports work in a browser.
if (typeof module === 'undefined') module = {exports:{}};
// Node.js hookups
module.exports.newShiftedMask = newShiftedMask;
module.exports.makeBitArray = makeBitArray;
module.exports.bitfieldHexString = bitfieldHexString;
module.exports.getLowestBitIndex = getLowestBitIndex;
module.exports.getHighestBitIndex = getHighestBitIndex;
module.exports.getBit = getBit;
module.exports.to_bitfield = to_bitfield;
module.exports.is_bitfield = is_bitfield;
module.exports.to_number = to_number;
module.exports.bitfield_zero = bitfield_zero;
module.exports.bitfield_one = bitfield_one;
module.exports.setup_bitfields = setup_bitfields;
module.exports.list_to_mask = list_to_mask;
module.exports.countOneBits = countOneBits;

