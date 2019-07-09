<!--
/////////////////////////////////////////////////////////////////////////////
// qcengine_qqtape.js
// Copyright 2014-2015 Eric Johnston, Machine Level
// ej@machinelevel.com
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

-->

function QQTape(name, num_bytes, bits_per_byte)
{
  // Storage size must be an even number for the optimized roll() to work correctly
  if ((num_bytes & 1) && num_bytes > 1)
    num_bytes++;
  this.name = name;
  this.num_bytes = num_bytes;
  this.bits_per_byte = bits_per_byte;
  this.storage = [];

  this.qubitsRequired = function()
  {
    return num_bytes * bits_per_byte;
  }

  this.activate = function()
  {
    this.storage = [];
    for (var i = 0; i < this.num_bytes; ++i)
      this.storage.push(qint.new(this.bits_per_byte, this.name + '[' + i + ']'));
  }

  this.head = function()
  {
    return this.storage[0];
  }

  this.set = function(loc, val)
  {
    if (loc < this.num_bytes)
      this.storage[loc].write(val);
  }

  this.setAll = function(val)
  {
    for (var i = 0; i < this.num_bytes; ++i)
      this.storage[i].write(val);
  }

  this.print = function(lookup)
  {
    qc.print('  ' + this.name + ':');
    for (var i = 0; i < this.num_bytes; ++i)
    {
      var val = this.storage[i].read();
      if (lookup)
        val = lookup[val];
        qc.print(' ' + val);
    }
    qc.print('\n');
  }

  this.roll = function(rollCond, rollNot, fwdCond, fwdNot, revCond, revNot)
  {
    if (this.num_bytes < 2)
      return;
    for (var i = 0; i < this.num_bytes; i += 2)
      this.storage[i].exchange(this.storage[i + 1], -1, rollCond, rollNot);

    // Roll forward or reverse
    for (var gap = 2; gap < this.num_bytes; gap *= 2)
    {
      for (var i = gap - 1; i < this.num_bytes - 1; i += 2 * gap)
      {
        var j = Math.min(i + gap, this.num_bytes - 1);
        var ri = this.num_bytes - i - 1;
        var rj = this.num_bytes - j - 1;
        this.storage[i].exchange(this.storage[j],   -1, fwdCond, fwdNot);
        this.storage[ri].exchange(this.storage[rj], -1, revCond, revNot);
      }
    }
  }

  this.rollFwd = function(rollCond, rollNot)
  {
    if (this.num_bytes < 2)
      return;
    for (var i = 0; i < this.num_bytes; i += 2)
      this.storage[i].exchange(this.storage[i + 1], -1, rollCond, rollNot);

    // Roll forward
    for (var gap = 2; gap < this.num_bytes; gap *= 2)
    {
      for (var i = gap - 1; i < this.num_bytes - 1; i += 2 * gap)
      {
        var j = Math.min(i + gap, this.num_bytes - 1);
        this.storage[i].exchange(this.storage[j],   -1, rollCond, rollNot);
      }
    }
  }

  this.rollBack = function(rollCond, rollNot)
  {
    if (this.num_bytes < 2)
      return;
    for (var i = 0; i < this.num_bytes; i += 2)
      this.storage[i].exchange(this.storage[i + 1], -1, rollCond, rollNot);

    // Roll forward
    for (var gap = 2; gap < this.num_bytes; gap *= 2)
    {
      for (var i = gap - 1; i < this.num_bytes - 1; i += 2 * gap)
      {
        var j = Math.min(i + gap, this.num_bytes - 1);
        var ri = this.num_bytes - i - 1;
        var rj = this.num_bytes - j - 1;
        this.storage[ri].exchange(this.storage[rj],   -1, rollCond, rollNot);
      }
    }
  }

}


