/////////////////////////////////////////////////////////////////////////////
// qcengine_webgl_block.js
// Copyright 2000-2015 Eric Johnston
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



// This is the foundation of the QCEngine GPU logic, and it's originally based on a
// fluid dynamics sample from http://www.ibiblio.org/e-notes/webgl/gpu/fluid.htm
// (see bottom for much more info.)



// TODO: Speed this up using ARB_shader_image_load_store to store
//       multiple values within the same texture. That means half the
//       number of fragment shader operations, if the extension is supported.
//   https://www.opengl.org/registry/specs/ARB/shader_image_load_store.txt
//   https://www.khronos.org/assets/uploads/developers/library/2011-siggraph-asia/OpenGL-4.2-SIGGRAPH-Asia_Dec-11.pdf

var shader_vs = 
'  attribute vec2 aPos;'+
'  attribute vec2 aTexCoord;'+
'  varying   vec2 tc;'+
'void main(void) {'+
'   gl_Position = vec4(aPos, 0., 1.);'+
'   tc = aTexCoord;'+
'}';

var shader_fs_qc_show = 
  'precision highp float;'+
  '  uniform sampler2D samp;'+
  '  varying vec2 tc;'+
  'void main(void) {'+
  '   vec4 pix = texture2D(samp, tc);'+
  '   float mag0 = pix.r * pix.r + pix.g * pix.g;'+
  '   float mag1 = pix.b * pix.b + pix.a * pix.a;'+
  '   gl_FragColor = vec4(mag0, mag1, 0, 1);'+
  '}';

// shader_fs_qc_debugfill_single
// Fill the buffer with invalid but trackable values
var shader_fs_qc_debugfill_single = 
  'precision highp float;'+
  '  uniform float height;'+
  '  uniform float width;'+
  '  varying vec2 tc;'+
  'void main(void) {'+
  '     vec4 val = vec4(floor(tc.x * width) * 4.0);'+
  '     val += vec4(0.0, 1.0, 2.0, 3.0);'+
  '     val += vec4(floor(tc.y * height) * width * 4.0);'+
  '     gl_FragData[0] = val;'+
//  '     gl_FragData[0] = vec4(1.0, 1.0, 1.0, 1.0);'+
  '}';


// shader_fs_qc_condmask1
// Fill the condition mask, bit 1 only
var shader_fs_qc_condmask1 = 
  'precision highp float;'+
  '  uniform float zeroVal;'+
  '  uniform float oneVal;'+
  '  varying vec2 tc;'+
  'void main(void) {'+
  '     gl_FragData[0] = vec4(zeroVal, zeroVal, oneVal, oneVal);'+
  '}';

// shader_fs_qc_setbit_single
// Zero out any parts of the condition mask where this bit doesn't meet the condition.
// Otherwise leave the buffer alone.
// Note this operates on one buffer at a time.
var shader_fs_qc_condmask = 
  'precision highp float;'+
  '  uniform float xspan;'+
  '  uniform float yspan;'+
  '  uniform float inv_xspan;'+
  '  uniform float inv_yspan;'+
  '  uniform float zeroVal;'+
  '  uniform float oneVal;'+
  '  varying vec2 tc;'+
  'void main(void) {'+
  '     vec2 span = vec2(xspan, yspan);'+
  '     vec2 inv_span = vec2(inv_xspan, inv_yspan);'+
  '     vec2 a = floor(tc * span);'+
  '     vec2 c = floor(a * 0.5) * 2.0;'+
  '     vec2 odd_even = (a - c);'+  // This will be 0 or 1, indicating which direction the pair is
  '     float match = (odd_even.x + odd_even.y);'+
  '     float result = mix(zeroVal, oneVal, match);'+
  '     if (result > 0.5)'+
  '         discard;'+
  '     gl_FragData[0] = vec4(0.0);'+
  '}';


// shader_fs_qc_clear_single
// Clear all values, except set the zero position to something specific.
// Note: This isn't necessary, except to initialize the hata to valid floats
// Optimization note: This can be done faster by removing the if(), but
// I don't think that's critical at this point.
var shader_fs_qc_clear_single = 
  'precision highp float;'+
  '  uniform float row_scale;'+
  '  uniform float column_scale;'+
  '  uniform float value_at_zero;'+
  '  varying vec2 tc;'+
  'void main(void) {'+
  '     highp int col = int(floor(tc.x * column_scale));'+
  '     highp int row = int(floor(tc.y * row_scale));'+
  '     if ((row + col) != 0)'+
  '       gl_FragData[0] = vec4(0., 0., 0., 0.);'+
  '     else'+
  '       gl_FragData[0] = vec4(value_at_zero, 0., 0., 0.);'+
  '}';

// shader_fs_qc_clear_dual
// Clear all values, except set the zero position to something specific.
// Note: This isn't necessary, except to initialize the hata to valid floats
// Optimization note: This can be done faster by removing the if(), but
// I don't think that's critical at this point.
var shader_fs_qc_clear_dual = 
  '#extension GL_EXT_draw_buffers : require\n'+
  'precision highp float;'+
  '  uniform float row_scale;'+
  '  uniform float column_scale;'+
  '  uniform float value_at_zero;'+
  '  varying vec2 tc;'+
  'void main(void) {'+
  '     highp int col = int(floor(tc.x * column_scale));'+
  '     highp int row = int(floor(tc.y * row_scale));'+
  '     if ((row + col) != 0)'+
  '       gl_FragData[0] = vec4(0., 0., 0., 0.);'+
  '     else'+
  '       gl_FragData[0] = vec4(value_at_zero, 0., 0., 0.);'+
  '     gl_FragData[1] = vec4(0., 0., 0., 0.);'+
  '}';

// shader_fs_qc_not_single
// Perform a logical not of any bit except bit 1.
// Note this operates on one buffer at a time.
var shader_fs_qc_not_single = 
  'precision highp float;'+
  '  uniform sampler2D src0;'+
  '  uniform float xspan;'+
  '  uniform float yspan;'+
  '  uniform float inv_xspan;'+
  '  uniform float inv_yspan;'+
  '  varying vec2 tc;'+
  'void main(void) {'+
  '     vec2 span = vec2(xspan, yspan);'+
  '     vec2 inv_span = vec2(inv_xspan, inv_yspan);'+
  '     vec2 a = floor(tc * span);'+
  '     vec2 c = floor(a * 0.5) * 2.0;'+
  '     vec2 odd_even = 2.0 * (a - c) - 1.0;'+  // This will be -1 or 1, indicating which direction the pair is
  '     vec2 pair = tc - odd_even * inv_span;'+
  '     vec4 pix0 = texture2D(src0, pair);'+
  '     gl_FragData[0] = pix0;'+
  '}';

// shader_fs_qc_cnot_single
// Perform a logical cnot of any bit except bit 1.
// Note this operates on one buffer at a time.
var shader_fs_qc_cnot_single = 
  'precision highp float;'+
  '  uniform sampler2D src0;'+
  '  uniform sampler2D condMask;'+
  '  uniform float xspan;'+
  '  uniform float yspan;'+
  '  uniform float inv_xspan;'+
  '  uniform float inv_yspan;'+
  '  varying vec2 tc;'+
  'void main(void) {'+
  '     vec2 span = vec2(xspan, yspan);'+
  '     vec2 inv_span = vec2(inv_xspan, inv_yspan);'+
  '     vec2 a = floor(tc * span);'+
  '     vec2 c = floor(a * 0.5) * 2.0;'+
  '     vec2 odd_even = 2.0 * (a - c) - 1.0;'+  // This will be -1 or 1, indicating which direction the pair is
  '     vec2 pair = tc - odd_even * inv_span;'+
  '     vec4 pix0 = texture2D(src0, tc);'+
  '     vec4 pix1 = texture2D(src0, pair);'+
  '     vec4 condPix0 = texture2D(condMask, tc);'+
  '     gl_FragData[0] = mix(pix0, pix1, condPix0);'+
  '}';

// shader_fs_qc_cnot_cross
// Perform a logical cnot of any bit except bit 1.
var shader_fs_qc_cnot_cross = 
  '#extension GL_EXT_draw_buffers : require\n'+
  'precision highp float;'+
  '  uniform sampler2D src0;'+
  '  uniform sampler2D src1;'+
  '  uniform sampler2D condMask;'+
  '  varying vec2 tc;'+
  'void main(void) {'+
  '     vec4 pix0 = texture2D(src0, tc);'+
  '     vec4 pix1 = texture2D(src1, tc);'+
  '     vec4 condPix0 = texture2D(condMask, tc);'+
  '     gl_FragData[0] = mix(pix0, pix1, condPix0);'+
  '     gl_FragData[1] = mix(pix1, pix0, condPix0);'+
  '}';

// shader_fs_qc_phase
// Perform a phase shift.
var shader_fs_qc_phase = 
  'precision highp float;'+
  '  uniform sampler2D src0;'+
  '  uniform sampler2D condMask;'+
  '  uniform float sval;'+
  '  uniform float cval;'+
  '  varying vec2 tc;'+
  'void main(void) {'+
  '     vec4 pix0 = texture2D(src0, tc);'+
  '     vec4 cscs = vec4(cval, -sval, cval, -sval);'+
  '     vec4 scsc = vec4(sval, cval, sval, cval);'+
  '     vec4 condPix0 = texture2D(condMask, tc);'+
  '     gl_FragData[0] = mix (pix0, pix0.xxzz * cscs + pix0.yyww * scsc, condPix0);'+
  '}';

// shader_fs_qc_2x2_single
// Perform a 2x2 matrix op on any bit except bit 1
// Note this operates on one buffer at a time.
// TODO: Use the imaginary values.
var shader_fs_qc_2x2_single = 
  'precision highp float;'+
  '  uniform sampler2D src0;'+
  '  uniform float xspan;'+
  '  uniform float yspan;'+
  '  uniform float inv_xspan;'+
  '  uniform float inv_yspan;'+
  '  uniform float m00r;'+
  '  uniform float m01r;'+
  '  uniform float m10r;'+
  '  uniform float m11r;'+
  '  uniform float m00i;'+
  '  uniform float m01i;'+
  '  uniform float m10i;'+
  '  uniform float m11i;'+
  '  varying vec2 tc;'+
  'void main(void) {'+
  '     vec4 mtxr = vec4(m00r, m01r, m10r, m11r);'+  
  '     vec4 mtxi = vec4(m00i, m01i, m10i, m11i);'+  
  '     vec4 signs = vec4(-1.0, 1.0, -1.0, 1.0);'+  
  '     vec2 span = vec2(xspan, yspan);'+
  '     vec2 inv_span = vec2(inv_xspan, inv_yspan);'+
  '     vec2 a = floor(tc * span);'+
  '     vec2 c = floor(a * 0.5) * 2.0;'+
  '     vec2 odd_even = a - c;'+  // This will be 0 or 1, indicating which direction the pair is
  '     vec2 oe_plus_minus = 2.0 * odd_even - 1.0;'+  // This will be -1 or 1, indicating which direction the pair is
  '     vec2 pair = tc - oe_plus_minus * inv_span;'+
  '     vec4 pix0 = texture2D(src0, tc);'+
  '     vec4 pix1 = texture2D(src0, pair);'+

// This works, and is good as reference. More compact version is below.
//  '     vec4 outval0 = vec4(m00r*pix0.x - m00i*pix0.y + m01r*pix1.x - m01i*pix1.y,'+
//  '                         m00r*pix0.y + m00i*pix0.x + m01r*pix1.y + m01i*pix1.x,'+
//  '                         m00r*pix0.z - m00i*pix0.w + m01r*pix1.z - m01i*pix1.w,'+
//  '                         m00r*pix0.w + m00i*pix0.z + m01r*pix1.w + m01i*pix1.z);'+
//  '     vec4 outval1 = vec4(m10r*pix1.x - m10i*pix1.y + m11r*pix0.x - m11i*pix0.y,'+
//  '                         m10r*pix1.y + m10i*pix1.x + m11r*pix0.y + m11i*pix0.x,'+
//  '                         m10r*pix1.z - m10i*pix1.w + m11r*pix0.z - m11i*pix0.w,'+
//  '                         m10r*pix1.w + m10i*pix1.z + m11r*pix0.w + m11i*pix0.z);'+
// Here's the compact vector version
  '     vec4 outval0 = pix0 * mtxr.xxxx + signs * pix0.yxwz * mtxi.xxxx + '+
  '                    pix1 * mtxr.yyyy + signs * pix1.yxwz * mtxi.yyyy;'+
  '     vec4 outval1 = pix1 * mtxr.zzzz + signs * pix1.yxwz * mtxi.zzzz + '+
  '                    pix0 * mtxr.wwww + signs * pix0.yxwz * mtxi.wwww;'+
  '     gl_FragData[0] = mix(outval0, outval1, odd_even.x+odd_even.y);'+
  '}';

// shader_fs_qc_2x2_cross
// Perform a 2x2 matrix op between two buffers.
// TODO: Use the imaginary values.
var shader_fs_qc_2x2_cross = 
  '#extension GL_EXT_draw_buffers : require\n'+
  'precision highp float;'+
  '  uniform sampler2D src0;'+
  '  uniform sampler2D src1;'+
  '  uniform float m00r;'+
  '  uniform float m01r;'+
  '  uniform float m10r;'+
  '  uniform float m11r;'+
  '  uniform float m00i;'+
  '  uniform float m01i;'+
  '  uniform float m10i;'+
  '  uniform float m11i;'+
  '  varying vec2 tc;'+
  'void main(void) {'+
  '     vec4 mtxr = vec4(m00r, m01r, m10r, m11r);'+  
  '     vec4 mtxi = vec4(m00i, m01i, m10i, m11i);'+  
  '     vec4 signs = vec4(-1.0, 1.0, -1.0, 1.0);'+  
  '     vec4 pix0 = texture2D(src0, tc);'+
  '     vec4 pix1 = texture2D(src1, tc);'+
  '     vec4 outval0 = pix0 * mtxr.xxxx + signs * pix0.yxwz * mtxi.xxxx + '+
  '                    pix1 * mtxr.yyyy + signs * pix1.yxwz * mtxi.yyyy;'+
  '     vec4 outval1 = pix0 * mtxr.zzzz + signs * pix0.yxwz * mtxi.zzzz + '+
  '                    pix1 * mtxr.wwww + signs * pix1.yxwz * mtxi.wwww;'+
  '     gl_FragData[0] = outval0;'+
  '     gl_FragData[1] = outval1;'+
  '}';

// shader_fs_qc_filterbit_single
// Calculate the sqr-mag of the values, and sift them left/right based on bit position.
// Note this operates on one buffer at a time.
var shader_fs_qc_filterbit_single = 
  'precision highp float;'+
  '  uniform sampler2D src0;'+
  '  uniform float xspan;'+
  '  uniform float yspan;'+
  '  uniform float inv_xspan;'+
  '  uniform float inv_yspan;'+
  '  varying vec2 tc;'+
  'void main(void) {'+
  '     vec2 span = vec2(xspan, yspan);'+
  '     vec2 inv_span = vec2(inv_xspan, inv_yspan);'+
  '     vec2 a = floor(tc * span);'+
  '     vec2 c = floor(a * 0.5) * 2.0;'+
  '     vec2 odd_even = a - c;'+  // This will be 0 or 1, indicating which direction the pair is
  '     vec4 pix0 = texture2D(src0, tc);'+
  '     pix0 *= pix0;'+
  '     float out_mag = pix0.x + pix0.y + pix0.z + pix0.w;'+
  '     gl_FragData[0] = mix(vec4(out_mag, 0.0, 0.0, 0.0), vec4(0.0, 0.0, 0.0, out_mag), odd_even.x + odd_even.y);'+
  '}';

// shader_fs_qc_add4x4_single
// Add 16 values together, resulting in a sum-texture 1/4 the size in each dimension
// Note this operates on one buffer at a time.
var shader_fs_qc_add4x4_single = 
  'precision highp float;'+
  '  uniform sampler2D src0;'+
  '  uniform float wfactor;'+
  '  uniform float hfactor;'+
  '  varying vec2 tc;'+
  'void main(void) {'+
  '     vec2 td = tc * vec2(wfactor, hfactor);'+
  '     vec4 pix0 = texture2D(src0, td);'+
  '     pix0     += texture2D(src0, vec2(td.x + wfactor,       td.y));'+
  '     pix0     += texture2D(src0, vec2(td.x + wfactor * 2.0, td.y));'+
  '     pix0     += texture2D(src0, vec2(td.x + wfactor * 3.0, td.y));'+
  '     pix0     += texture2D(src0, vec2(td.x,                 td.y + hfactor));'+
  '     pix0     += texture2D(src0, vec2(td.x + wfactor,       td.y + hfactor));'+
  '     pix0     += texture2D(src0, vec2(td.x + wfactor * 2.0, td.y + hfactor));'+
  '     pix0     += texture2D(src0, vec2(td.x + wfactor * 3.0, td.y + hfactor));'+
  '     pix0     += texture2D(src0, vec2(td.x,                 td.y + hfactor * 2.0));'+
  '     pix0     += texture2D(src0, vec2(td.x + wfactor,       td.y + hfactor * 2.0));'+
  '     pix0     += texture2D(src0, vec2(td.x + wfactor * 2.0, td.y + hfactor * 2.0));'+
  '     pix0     += texture2D(src0, vec2(td.x + wfactor * 3.0, td.y + hfactor * 2.0));'+
  '     pix0     += texture2D(src0, vec2(td.x,                 td.y + hfactor * 3.0));'+
  '     pix0     += texture2D(src0, vec2(td.x + wfactor,       td.y + hfactor * 3.0));'+
  '     pix0     += texture2D(src0, vec2(td.x + wfactor * 2.0, td.y + hfactor * 3.0));'+
  '     pix0     += texture2D(src0, vec2(td.x + wfactor * 3.0, td.y + hfactor * 3.0));'+
  '     gl_FragData[0] = pix0;'+
  '}';

// shader_fs_qc_setbit_single
// Set a bit (other than bit 1) to a value by zeroing out areas inconsistent with the value.
// Note this operates on one buffer at a time.
var shader_fs_qc_setbit_single = 
  'precision highp float;'+
  '  uniform sampler2D src0;'+
  '  uniform float xspan;'+
  '  uniform float yspan;'+
  '  uniform float inv_xspan;'+
  '  uniform float inv_yspan;'+
  '  uniform float value;'+
  '  varying vec2 tc;'+
  'void main(void) {'+
  '     vec2 span = vec2(xspan, yspan);'+
  '     vec2 inv_span = vec2(inv_xspan, inv_yspan);'+
  '     vec2 a = floor(tc * span);'+
  '     vec2 c = floor(a * 0.5) * 2.0;'+
  '     vec2 odd_even = (a - c);'+  // This will be 0 or 1, indicating which direction the pair is
  '     float match = (odd_even.x + odd_even.y);'+
  '     match = mix(1.0 - match, match, value);'+
  '     vec4 pix0 = texture2D(src0, tc);'+
  '     gl_FragData[0] = match * pix0;'+
  '}';

// shader_fs_qc_not1_single
// Perform a logical not of bit 1. (Swap adjacent pairs)
// Note this operates on one buffer at a time.
var shader_fs_qc_not1_single = 
  'precision highp float;'+
  '  uniform sampler2D src0;'+
  '  varying vec2 tc;'+
  'void main(void) {'+
  '     vec4 pix0 = texture2D(src0, tc);'+
  '     gl_FragData[0] = pix0.barg;'+
  '}';

// shader_fs_qc_cnot1_single
// Perform a logical cnot of bit 1. (Swap adjacent pairs)
// Note this operates on one buffer at a time.
var shader_fs_qc_cnot1_single = 
  'precision highp float;'+
  '  uniform sampler2D src0;'+
  '  uniform sampler2D condMask;'+
  '  varying vec2 tc;'+
  'void main(void) {'+
  '     vec4 pix0 = texture2D(src0, tc);'+
  '     vec4 cond0 = texture2D(condMask, tc);'+
  '     gl_FragData[0] = mix(pix0, pix0.barg, cond0);'+
  '}';

// shader_fs_qc_2x21_single
// Perform a 2x2 matrix op on bit 1
// Note this operates on one buffer at a time.
// TODO: Use the imaginary values.
var shader_fs_qc_2x21_single = 
  'precision highp float;'+
  '  uniform sampler2D src0;'+
  '  uniform float m00r;'+
  '  uniform float m01r;'+
  '  uniform float m10r;'+
  '  uniform float m11r;'+
  '  uniform float m00i;'+
  '  uniform float m01i;'+
  '  uniform float m10i;'+
  '  uniform float m11i;'+
  '  varying vec2 tc;'+
  'void main(void) {'+
  '     vec4 pix0 = texture2D(src0, tc);'+  
  '     vec4 mtxr = vec4(m00r, m01r, m10r, m11r);'+  
  '     vec4 mtxi0 = vec4(-m00i, m00i, -m10i, m10i);'+  
  '     vec4 mtxi1 = vec4(-m01i, m01i, -m11i, m11i);'+  
  '     vec4 outval = pix0 * mtxr.xxww + pix0.zwxy * mtxr.yyzz;'+
  '     outval += pix0.yxyx * mtxi0 + pix0.wzwz * mtxi1;'+
  '     gl_FragData[0] = outval;'+
  '}';

// shader_fs_qc_filterbit1_single
// Put the mag^2 of zero values in even floats
// Put the mag^2 of one values in odd floats
// Note this operates on one buffer at a time.
var shader_fs_qc_filterbit1_single = 
  'precision highp float;'+
  '  uniform sampler2D src0;'+
  '  varying vec2 tc;'+
  'void main(void) {'+
  '     vec4 pix0 = texture2D(src0, tc);'+
  '     pix0 *= pix0;'+
  '     gl_FragData[0] = vec4(pix0.x + pix0.y, 0.0, 0.0, pix0.z + pix0.w);'+
  '}';

// shader_fs_qc_setbit1_single
// Set bit 1 to a value by zeroing out areas inconsistent with the value.
// Note this operates on one buffer at a time.
var shader_fs_qc_setbit1_single = 
  'precision highp float;'+
  '  uniform sampler2D src0;'+
  '  uniform float value;'+
  '  varying vec2 tc;'+
  'void main(void) {'+
  '     vec4 pix0 = texture2D(src0, tc);'+
  '     gl_FragData[0] = mix(vec4(pix0.rg, 0.0, 0.0), vec4(0.0, 0.0, pix0.ba), value);'+
  '}';

// shader_fs_qc_scale_single
// Perform a scale all values
// Note this operates on one buffer at a time.
var shader_fs_qc_scale_single = 
  'precision highp float;'+
  '  uniform sampler2D src0;'+
  '  uniform float scale;'+
  '  varying vec2 tc;'+
  'void main(void) {'+
  '     gl_FragData[0] = scale * texture2D(src0, tc);'+
  '}';

// shader_fs_qc_not1_dual
// Perform a logical not of bit 1. (Swap adgacent pairs)
// Note this operates on two buffers at a time.
var shader_fs_qc_not1_dual = 
  '#extension GL_EXT_draw_buffers : require\n'+
  'precision highp float;'+
  '  uniform sampler2D src0;'+
  '  uniform sampler2D src1;'+
  '  varying vec2 tc;'+
  'void main(void) {'+
  '     vec4 pix0 = texture2D(src0, tc);'+
  '     vec4 pix1 = texture2D(src1, tc);'+  
  '     gl_FragData[0] = pix0.barg;'+
  '     gl_FragData[1] = pix1.barg;'+
  '}';


var gl = null;
var do_gl_flush_timing = false;

function setupShader(name, pix, vtx)
{
    var sh  = gl.createProgram();
    gl.attachShader(sh, vtx);
    gl.attachShader(sh, getShader( gl, name, pix, gl.FRAGMENT_SHADER ));
    gl.linkProgram(sh);
    gl.useProgram(sh);
    return sh;
}

function QCEngineWebGLBlock(gpuBlockSet)
{
    this.blockSet = gpuBlockSet;
    this.textureData = [null];
    this.textureData[0] = gl.createTexture();
    this.blockSet.allBlocks.push(this.textureData[0]);
    gl.bindTexture(gl.TEXTURE_2D, this.textureData[0]);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.blockSet.width, this.blockSet.height, 0, gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    this.op_debugfill = function(buf)
    {
        this.read_cache_is_valid = false;
        var src = this.textureData;
        if (buf != null)
            src = [buf];
        gl.useProgram(this.blockSet.prog_qc_debugfill_single);
        this.blockSet.apply(0, 1, null, src, null, false);
    }

    this.op_clear = function(valueAtZero)
    {
        this.read_cache_is_valid = false;
        if (this.blockSet.debug)
            this.debug_print('Before op_clear: ');
        gl.useProgram(this.blockSet.prog_qc_clear_single);
        gl.uniform1f(this.blockSet.arg_clear_single_value_at_zero, valueAtZero);
        this.blockSet.apply(0, 1, null, this.textureData, null, false);
        if (this.blockSet.debug)
            this.debug_print('After op_clear: ');
//this.op_debugfill();
    }

    this.op_not = function(targetBit, condBits, condNotBits, pairBlock)
    {
        this.read_cache_is_valid = false;
        if (this.blockSet.debug)
            this.debug_print('Before op_not('+targetBit+', '+condBits+', '+condNotBits+'): ');
        if (this.blockSet.debug && pairBlock && pairBlock != this)
            pairBlock.debug_print('(pair) Before op_not('+targetBit+'): ');
        if (condBits || condNotBits)
        {
            this.blockSet.createConditionMask(condBits, condNotBits);
            if (pairBlock && pairBlock != this)
            {
                var src = [this.textureData[0], pairBlock.textureData[0]];
                gl.useProgram(this.blockSet.prog_qc_cnot_cross);
                this.blockSet.apply(0, 2, src, this.blockSet.scratchData, this.blockSet.conditionMask, true);
                this.textureData[0] = src[0];
                pairBlock.textureData[0] = src[1];
            }
            else if (targetBit == 1)
            {
                gl.useProgram(this.blockSet.prog_qc_cnot1_single);
                this.blockSet.apply(0, 1, this.textureData, this.blockSet.scratchData, this.blockSet.conditionMask, true);
            }
            else
            {
                var span = this.blockSet.set_span_args(targetBit);
                gl.useProgram(this.blockSet.prog_qc_cnot_single);
                if (this.blockSet.arg_cnot_single_xspan_CURR != span.xspan)
                {
                    gl.uniform1f(this.blockSet.arg_cnot_single_xspan, span.xspan);
                    gl.uniform1f(this.blockSet.arg_cnot_single_inv_xspan, span.inv_xspan);
                    this.blockSet.arg_cnot_single_xspan_CURR = span.xspan;
                }
                if (this.blockSet.arg_cnot_single_yspan_CURR != span.yspan)
                {
                    gl.uniform1f(this.blockSet.arg_cnot_single_yspan, span.yspan);
                    gl.uniform1f(this.blockSet.arg_cnot_single_inv_yspan, span.inv_yspan);
                    this.blockSet.arg_cnot_single_yspan_CURR = span.yspan;
                }
                this.blockSet.apply(0, 1, this.textureData, this.blockSet.scratchData, this.blockSet.conditionMask, true);
            }
        }
        else
        {
            if (targetBit == 1)
            {
                gl.useProgram(this.blockSet.prog_qc_not1_single);
                this.blockSet.apply(0, 1, this.textureData, this.blockSet.scratchData, null, true);
            }
            else
            {
                var span = this.blockSet.set_span_args(targetBit);
                gl.useProgram(this.blockSet.prog_qc_not_single);
                if (this.blockSet.arg_not_single_xspan_CURR != span.xspan)
                {
                    gl.uniform1f(this.blockSet.arg_not_single_xspan, span.xspan);
                    gl.uniform1f(this.blockSet.arg_not_single_inv_xspan, span.inv_xspan);
                    this.blockSet.arg_not_single_xspan_CURR = span.xspan;
                }
                if (this.blockSet.arg_not_single_yspan_CURR != span.yspan)
                {
                    gl.uniform1f(this.blockSet.arg_not_single_yspan, span.yspan);
                    gl.uniform1f(this.blockSet.arg_not_single_inv_yspan, span.inv_yspan);
                    this.blockSet.arg_not_single_yspan_CURR = span.yspan;
                }
                this.blockSet.apply(0, 1, this.textureData, this.blockSet.scratchData, null, true);
            }
        }
        if (this.blockSet.debug)
            this.debug_print('After op_not('+targetBit+', '+condBits+', '+condNotBits+'): ');
        if (this.blockSet.debug && pairBlock && pairBlock != this)
            pairBlock.debug_print('(pair) After op_not('+targetBit+'): ');
    }

    // Phase could be done as a general 2x2, but this is faster.
    this.op_phase = function(condBits, condNotBits, sval, cval)
    {
        this.read_cache_is_valid = false;
        if (this.blockSet.debug)
            this.debug_print('Before op_phase('+condBits+', '+condNotBits+'): ');

        this.blockSet.createConditionMask(condBits, condNotBits);

        gl.useProgram(this.blockSet.prog_qc_phase);
        gl.uniform1f(this.blockSet.arg_phase_sval, sval);
        gl.uniform1f(this.blockSet.arg_phase_cval, cval);
        this.blockSet.apply(0, 1, this.textureData, this.blockSet.scratchData, this.blockSet.conditionMask, true);
        if (this.blockSet.debug)
            this.debug_print('After op_phase('+condBits+', '+condNotBits+'): ');
    }

    this.op_2x2 = function(targetBit, mtx2x2, pairBlock)
    {
        this.read_cache_is_valid = false;
        if (this.blockSet.debug)
            this.debug_print('Before op_2x2('+targetBit+'): ');
        if (this.blockSet.debug && pairBlock != this)
            pairBlock.debug_print('(pair) Before op_2x2('+targetBit+'): ');
        if (this.blockSet.debug)
            console.log(mtx2x2);
        if (pairBlock != this)
        {
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
        }
        else if (targetBit == 1)
        {
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
        }
        else
        {
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
        if (this.blockSet.debug)
            this.debug_print('After op_2x2('+targetBit+'): ');
        if (this.blockSet.debug && pairBlock != this)
            pairBlock.debug_print('(pair) After op_2x2('+targetBit+'): ');
    }

    this.ready_read_cache = function()
    {
        if (1 || this.blockSet.use_read_cache)
        {
            if (!this.read_cache_is_valid)
            {
                var src = this.textureData[0];
                this.read_cache = this.blockSet.peek_values(this.read_cache, src, this.width, this.height, 0, 0);
                this.cache_is_valid = true;
            }
            return true;
        }
        return false;
    }

    this.peek_probability = function(targetBit)
    {
        if (this.blockSet.debug)
            this.debug_print('Before op_peek_probability('+targetBit+'): ');
        // If targetBit == 0, then compute the squared length of the whole vector.
        var do_length_squared = false;
        if (targetBit == 0)
        {
            do_length_squared = true;
            targetBit = 1;
        }

        if (targetBit == 1)
        {
            gl.useProgram(this.blockSet.prog_qc_filterbit1_single);
            this.blockSet.apply(0, 1, this.textureData, this.blockSet.scratchData, null, false);
        }
        else
        {
            var span = this.blockSet.set_span_args(targetBit);
            gl.useProgram(this.blockSet.prog_qc_filterbit_single);
            gl.uniform1f(this.blockSet.arg_filterbit_single_xspan, span.xspan);
            gl.uniform1f(this.blockSet.arg_filterbit_single_yspan, span.yspan);
            gl.uniform1f(this.blockSet.arg_filterbit_single_inv_xspan, span.inv_xspan);
            gl.uniform1f(this.blockSet.arg_filterbit_single_inv_yspan, span.inv_yspan);
            this.blockSet.apply(0, 1, this.textureData, this.blockSet.scratchData, null, false);
        }
        // At this point, scratchData[0] contains the entire block sorted fo that
        // x and z are value 0, and y and w are value 1. Now we just add them all up.
        var w = this.blockSet.width;
        var h = this.blockSet.height;
        var src = [this.blockSet.scratchData[0]];
        var dst = [this.blockSet.scratchData[1]];
        while (w >= 4 && h >= 4)
        {
            w >>= 2;
            h >>= 2;
            if (this.blockSet.debug)
              console.log('add4x4 w:'+w+' h:'+h);
            gl.useProgram(this.blockSet.prog_qc_add4x4_single);
            gl.uniform1f(this.blockSet.arg_add4x4_single_wfactor, w / this.blockSet.width);
            gl.uniform1f(this.blockSet.arg_add4x4_single_hfactor, h / this.blockSet.height);
            if (this.blockSet.debug)
                this.debug_print('before mid-2 op_peek_probability('+targetBit+'): ', src[0]);
            this.blockSet.apply(0, 1, src, dst, null, true, w / this.blockSet.width, h / this.blockSet.height);
            if (this.blockSet.debug)
                this.debug_print('after mid-2 op_peek_probability('+targetBit+'): ', src[0]);
        }
        // Now the src item contains a very small image (wxh).
        // We need to read that, and then finish the addition.
        var buffer = this.peek_values(null, src[0], w, h);
        var count = w * h * 4;
        var probability = 0.0;
        if (do_length_squared)
        {
            for (var i = 0; i < count; ++i)
                probability += buffer[i];
        }
        else
        {
            for (var i = 1; i < count; i += 2)
                probability += buffer[i];
        }
        if (this.blockSet.debug)
            this.debug_print('After op_peek_probability('+targetBit+') = '+probability);
        return probability;
    }

    this.op_set_bits = function(targetQubits, targetValues)
    {
        this.read_cache_is_valid = false;
//        this.op_debugfill();
        if (this.blockSet.debug)
            this.debug_print('Before op_set_bits('+targetQubits+', '+targetValues+'): ');
        if (targetQubits & 1)
        {
            var value = targetValues & 1;
            gl.useProgram(this.blockSet.prog_qc_setbit1_single);
            gl.uniform1f(this.blockSet.arg_setbit1_single_value, value);
            this.blockSet.apply(0, 1, this.textureData, this.blockSet.scratchData, null, true);            
        }
        for (var bit = 1; bit < this.blockSet.qReg.numBlockQubits; ++bit)
        {
            var mask = 1 << bit;
            if (targetQubits & mask)
            {
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
        if (this.blockSet.debug)
            this.debug_print('After op_set_bits('+targetQubits+', '+targetValues+'): ');
    }

    this.op_scale = function(scale)
    {
        this.read_cache_is_valid = false;
        if (scale == 1.0)
            return;
        if (this.blockSet.debug)
            this.debug_print('Before op_scale('+scale+'): ');
        gl.useProgram(this.blockSet.prog_qc_scale_single);
        gl.uniform1f(this.blockSet.arg_scale_single_scale, scale);
        this.blockSet.apply(0, 1, this.textureData, this.blockSet.scratchData, null, true);
        if (this.blockSet.debug)
            this.debug_print('After op_scale('+scale+'): ');
    }

    this.peek_values = function(dst, src, width, height)
    {
        if (src == null)
            src = this.textureData[0];
        return this.blockSet.peek_values(dst, src, width, height);
    }

    this.peek_complex_value = function(targetValue)
    {
        if (this.ready_read_cache())
            return new Vec2(this.read_cache[targetValue * 2], this.read_cache[targetValue * 2 + 1]);

        var pix_index = targetValue >> 1;
        var src = this.textureData[0];
        var start_x = pix_index % this.blockSet.width;
        var start_y = Math.floor(pix_index / this.blockSet.width);
        var dst = this.blockSet.peek_values(null, src, 1, 1, start_x, start_y);
        if (targetValue & 1)
            return new Vec2(dst[2], dst[3]);
        else
            return new Vec2(dst[0], dst[1]);
    }

    this.debug_print = function(message, buffer)
    {
        if (buffer == null)
            buffer = this.textureData[0];
        this.blockSet.debug_print(message, buffer);
    }

    this.side_by_side_check = function(message, cpu_buffer, gpu_val, cpu_val)
    {
        var tolerance = 0.01;
        if (message == null)
            message = '';
        if (cpu_buffer)
        {
            var gpu_buffer = this.peek_values(null, null);
            for (var i = 0; i < cpu_buffer.length; ++i)
            {
                var diff = Math.abs(cpu_buffer[i] - gpu_buffer[i]);
                if (diff > tolerance || isNaN(gpu_buffer[i]) || isNaN(cpu_buffer[i]))
                {
                    console.log('SxS error ('+message + '): at ['+i+'] gpu:'+gpu_buffer[i]+' cpu:'+cpu_buffer[i]+'.');
                    console.log(gpu_buffer);
                    console.log(cpu_buffer);
                    crash.here();
                }
            }
        }
        else
        {
            var diff = Math.abs(cpu_val - gpu_val);
            if (diff > tolerance || isNaN(gpu_val) || isNaN(cpu_val))
            {
                console.log('SxS error ('+message + '): gpu:'+gpu_val+' cpu:'+cpu_val+'.');
                crash.here();
            }
        }
    }

    this.destruct = function()
    {
        for (var i = 0; i < this.blockSet.allBlocks.length; ++i)
        {
            if (this.blockSet.allBlocks[i] == this.textureData[0])
                this.blockSet.allBlocks[i] = null;
        }
        gl.deleteTexture(this.textureData[0]);
    }

}

function QCEngineWebGLBlockSet(canvas_name)
{
    this.width = 16;
    this.height = 16;
    this.allBlocks = [];
    this.ready = false;
    this.debug = false;
    this.side_by_side_checking = false; // This runs both GPU and CPU, and then compares the results.
    this.savedCondMasks = {};
    this.numSavedCondMasks = 0;
    this.canvas = document.getElementById(canvas_name);
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.use_read_cache = true;

    this.initialize = function(qReg)
    {
        this.ready = false;
        for (var i = 0; i < this.allBlocks.length; ++i)
        {
            // delete the blocks
            if (this.allBlocks[i] != null)
                gl.deleteTexture(this.allBlocks[i]);
//            gl.deleteBuffer(someOtherBuffer);
//            gl.deleteRenderbuffer(someRenderbuffer);
//            gl.deleteFramebuffer(someFramebuffer);
        }
        this.allBlocks = [];
        this.savedCondMasks = {};
        this.numSavedCondMasks = 0;

        this.qReg = qReg;
        this.heightQubits = Math.floor(qReg.numBlockQubits / 2);
        this.widthQubits = qReg.numBlockQubits - this.heightQubits;
        this.width = 1 << (this.widthQubits - 1);
        this.height = 1 << this.heightQubits;
        this.ext = null;
        if (this.canvas)
        {
            this.canvas.width = this.width;
            this.canvas.height = this.height;
        }
        try {
            if (gl == null)
                gl = this.canvas.getContext("experimental-webgl");
        } catch(e) {}
        if ( !gl ) {
            alert("Can't get WebGL");
            return false;
        }

        gl.viewport(0, 0, this.width, this.height);

        if (!window.WebGLRenderingContext)
        {
            alert("Your browser does not support WebGL. See http://get.webgl.org");
            return false;
        }

        try {
            this.ext = gl.getExtension("OES_texture_float");
        } catch(e) {}
        if ( !this.ext )
        {
            alert("Your browser does not support OES_texture_float extension");
            return false;
        }

        this.ext_buff = gl.getExtension('WEBGL_draw_buffers');
        if (!this.ext_buff) {
            alert("Your browser does not support WEBGL_draw_buffers extension");
            return false;
        }

        var vshader = getShader( gl, 'shader_vs', shader_vs, gl.VERTEX_SHADER);

        this.prog_qc_show = setupShader('shader_fs_qc_show', shader_fs_qc_show, vshader);
        gl.uniform1i(gl.getUniformLocation(this.prog_qc_show, "samp"), 0);

        this.prog_qc_debugfill_single = setupShader('shader_fs_qc_debugfill_single', shader_fs_qc_debugfill_single, vshader);
        gl.uniform1f(gl.getUniformLocation(this.prog_qc_debugfill_single, "height"), this.height);
        gl.uniform1f(gl.getUniformLocation(this.prog_qc_debugfill_single, "width"), this.width);

        this.prog_qc_condmask1 = setupShader('shader_fs_qc_condmask1', shader_fs_qc_condmask1, vshader);
        this.arg_condmask1_zeroVal = gl.getUniformLocation(this.prog_qc_condmask1, "zeroVal");
        this.arg_condmask1_oneVal = gl.getUniformLocation(this.prog_qc_condmask1, "oneVal");

        this.prog_qc_condmask = setupShader('shader_fs_qc_condmask', shader_fs_qc_condmask, vshader);
        this.arg_condmask_xspan = gl.getUniformLocation(this.prog_qc_condmask, "xspan");
        this.arg_condmask_yspan = gl.getUniformLocation(this.prog_qc_condmask, "yspan");
        this.arg_condmask_inv_xspan = gl.getUniformLocation(this.prog_qc_condmask, "inv_xspan");
        this.arg_condmask_inv_yspan = gl.getUniformLocation(this.prog_qc_condmask, "inv_yspan");
        this.arg_condmask_zeroVal = gl.getUniformLocation(this.prog_qc_condmask, "zeroVal");
        this.arg_condmask_oneVal = gl.getUniformLocation(this.prog_qc_condmask, "oneVal");

        this.prog_qc_clear_single = setupShader('shader_fs_qc_clear_single', shader_fs_qc_clear_single, vshader);
        gl.uniform1f(gl.getUniformLocation(this.prog_qc_clear_single, "row_scale"), this.height);
        gl.uniform1f(gl.getUniformLocation(this.prog_qc_clear_single, "column_scale"), this.width);
        this.arg_clear_single_value_at_zero = gl.getUniformLocation(this.prog_qc_clear_single, "value_at_zero");

        this.prog_qc_clear_dual = setupShader('shader_fs_qc_clear_dual', shader_fs_qc_clear_dual, vshader);
        gl.uniform1f(gl.getUniformLocation(this.prog_qc_clear_dual, "row_scale"), this.height);
        gl.uniform1f(gl.getUniformLocation(this.prog_qc_clear_dual, "column_scale"), this.width);
        this.arg_clear_dual_value_at_zero = gl.getUniformLocation(this.prog_qc_clear_dual, "value_at_zero");

        this.prog_qc_not1_single = setupShader('shader_fs_qc_not1_single', shader_fs_qc_not1_single, vshader);
        gl.uniform1i(gl.getUniformLocation(this.prog_qc_not1_single, "src0"), 0);

        this.prog_qc_cnot1_single = setupShader('shader_fs_qc_cnot1_single', shader_fs_qc_cnot1_single, vshader);
        gl.uniform1i(gl.getUniformLocation(this.prog_qc_cnot1_single, "src0"), 0);
        gl.uniform1i(gl.getUniformLocation(this.prog_qc_cnot1_single, "condMask"), 2);

        this.prog_qc_2x21_single = setupShader('shader_fs_qc_2x21_single', shader_fs_qc_2x21_single, vshader);
        gl.uniform1i(gl.getUniformLocation(this.prog_qc_2x21_single, "src0"), 0);
        this.arg_2x21_m00r = gl.getUniformLocation(this.prog_qc_2x21_single, "m00r");
        this.arg_2x21_m01r = gl.getUniformLocation(this.prog_qc_2x21_single, "m01r");
        this.arg_2x21_m10r = gl.getUniformLocation(this.prog_qc_2x21_single, "m10r");
        this.arg_2x21_m11r = gl.getUniformLocation(this.prog_qc_2x21_single, "m11r");
        this.arg_2x21_m00i = gl.getUniformLocation(this.prog_qc_2x21_single, "m00i");
        this.arg_2x21_m01i = gl.getUniformLocation(this.prog_qc_2x21_single, "m01i");
        this.arg_2x21_m10i = gl.getUniformLocation(this.prog_qc_2x21_single, "m10i");
        this.arg_2x21_m11i = gl.getUniformLocation(this.prog_qc_2x21_single, "m11i");

        this.prog_qc_filterbit1_single = setupShader('shader_fs_qc_filterbit1_single', shader_fs_qc_filterbit1_single, vshader);
        gl.uniform1i(gl.getUniformLocation(this.prog_qc_filterbit1_single, "src0"), 0);

        this.prog_qc_setbit1_single = setupShader('shader_fs_qc_setbit1_single', shader_fs_qc_setbit1_single, vshader);
        gl.uniform1i(gl.getUniformLocation(this.prog_qc_setbit1_single, "src0"), 0);
        this.arg_setbit1_single_value = gl.getUniformLocation(this.prog_qc_setbit1_single, "value");

        this.prog_qc_scale_single = setupShader('shader_fs_qc_scale_single', shader_fs_qc_scale_single, vshader);
        gl.uniform1i(gl.getUniformLocation(this.prog_qc_scale_single, "src0"), 0);
        this.arg_scale_single_scale = gl.getUniformLocation(this.prog_qc_scale_single, "scale");

        this.prog_qc_not_single = setupShader('shader_fs_qc_not_single', shader_fs_qc_not_single, vshader);
        gl.uniform1i(gl.getUniformLocation(this.prog_qc_not_single, "src0"), 0);
        this.arg_not_single_xspan = gl.getUniformLocation(this.prog_qc_not_single, "xspan");
        this.arg_not_single_yspan = gl.getUniformLocation(this.prog_qc_not_single, "yspan");
        this.arg_not_single_inv_xspan = gl.getUniformLocation(this.prog_qc_not_single, "inv_xspan");
        this.arg_not_single_inv_yspan = gl.getUniformLocation(this.prog_qc_not_single, "inv_yspan");
        this.arg_not_single_xspan_CURR = null;
        this.arg_not_single_yspan_CURR = null;

        this.prog_qc_cnot_single = setupShader('shader_fs_qc_cnot_single', shader_fs_qc_cnot_single, vshader);
        gl.uniform1i(gl.getUniformLocation(this.prog_qc_cnot_single, "src0"), 0);
        gl.uniform1i(gl.getUniformLocation(this.prog_qc_cnot_single, "condMask"), 2);
        this.arg_cnot_single_xspan = gl.getUniformLocation(this.prog_qc_cnot_single, "xspan");
        this.arg_cnot_single_yspan = gl.getUniformLocation(this.prog_qc_cnot_single, "yspan");
        this.arg_cnot_single_inv_xspan = gl.getUniformLocation(this.prog_qc_cnot_single, "inv_xspan");
        this.arg_cnot_single_inv_yspan = gl.getUniformLocation(this.prog_qc_cnot_single, "inv_yspan");
        this.arg_cnot_single_xspan_CURR = null;
        this.arg_cnot_single_yspan_CURR = null;

        this.prog_qc_cnot_cross = setupShader('shader_fs_qc_cnot_cross', shader_fs_qc_cnot_cross, vshader);
        gl.uniform1i(gl.getUniformLocation(this.prog_qc_cnot_cross, "src0"), 0);
        gl.uniform1i(gl.getUniformLocation(this.prog_qc_cnot_cross, "src1"), 1);
        gl.uniform1i(gl.getUniformLocation(this.prog_qc_cnot_cross, "condMask"), 2);

        this.prog_qc_phase = setupShader('shader_fs_qc_phase', shader_fs_qc_phase, vshader);
        gl.uniform1i(gl.getUniformLocation(this.prog_qc_phase, "src0"), 0);
        gl.uniform1i(gl.getUniformLocation(this.prog_qc_phase, "condMask"), 2);
        this.arg_phase_sval = gl.getUniformLocation(this.prog_qc_phase, "sval");
        this.arg_phase_cval = gl.getUniformLocation(this.prog_qc_phase, "cval");

        this.prog_qc_2x2_single = setupShader('shader_fs_qc_2x2_single', shader_fs_qc_2x2_single, vshader);
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

        this.prog_qc_2x2_cross = setupShader('shader_fs_qc_2x2_cross', shader_fs_qc_2x2_cross, vshader);
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

        this.prog_qc_filterbit_single = setupShader('shader_fs_qc_filterbit_single', shader_fs_qc_filterbit_single, vshader);
        gl.uniform1i(gl.getUniformLocation(this.prog_qc_filterbit_single, "src0"), 0);
        this.arg_filterbit_single_xspan = gl.getUniformLocation(this.prog_qc_filterbit_single, "xspan");
        this.arg_filterbit_single_yspan = gl.getUniformLocation(this.prog_qc_filterbit_single, "yspan");
        this.arg_filterbit_single_inv_xspan = gl.getUniformLocation(this.prog_qc_filterbit_single, "inv_xspan");
        this.arg_filterbit_single_inv_yspan = gl.getUniformLocation(this.prog_qc_filterbit_single, "inv_yspan");

        this.prog_qc_add4x4_single = setupShader('shader_fs_qc_add4x4_single', shader_fs_qc_add4x4_single, vshader);
        gl.uniform1i(gl.getUniformLocation(this.prog_qc_add4x4_single, "src0"), 0);
        this.arg_add4x4_single_wfactor = gl.getUniformLocation(this.prog_qc_add4x4_single, "wfactor");
        this.arg_add4x4_single_hfactor = gl.getUniformLocation(this.prog_qc_add4x4_single, "hfactor");

        this.prog_qc_setbit_single = setupShader('shader_fs_qc_setbit_single', shader_fs_qc_setbit_single, vshader);
        gl.uniform1i(gl.getUniformLocation(this.prog_qc_setbit_single, "src0"), 0);
        this.arg_setbit_single_xspan = gl.getUniformLocation(this.prog_qc_setbit_single, "xspan");
        this.arg_setbit_single_yspan = gl.getUniformLocation(this.prog_qc_setbit_single, "yspan");
        this.arg_setbit_single_inv_xspan = gl.getUniformLocation(this.prog_qc_setbit_single, "inv_xspan");
        this.arg_setbit_single_inv_yspan = gl.getUniformLocation(this.prog_qc_setbit_single, "inv_yspan");
        this.arg_setbit_single_value = gl.getUniformLocation(this.prog_qc_setbit_single, "value");

        this.prog_qc_not1_dual = setupShader('shader_fs_qc_not1_dual', shader_fs_qc_not1_dual, vshader);
        gl.uniform1i(gl.getUniformLocation(this.prog_qc_not1_dual, "src0"), 0);
        gl.uniform1i(gl.getUniformLocation(this.prog_qc_not1_dual, "src1"), 1);

        gl.useProgram(this.prog_qc_show);
        var aPosLoc = gl.getAttribLocation(this.prog_qc_show, "aPos");
        var aTexLoc = gl.getAttribLocation(this.prog_qc_show, "aTexCoord");
        gl.enableVertexAttribArray( aPosLoc );
        gl.enableVertexAttribArray( aTexLoc );
        var data = new Float32Array([-1,-1, 0,0,  1,-1, 1,0,  -1,1, 0,1,  1,1, 1,1]);
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, gl.FALSE, 16, 0);
        gl.vertexAttribPointer(aTexLoc, 2, gl.FLOAT, gl.FALSE, 16, 8);


        // Set up the textures
        this.scratchData = [null, null];
        for (var i = 0; i < 2; ++i)
        {
            this.scratchData[i] = gl.createTexture();
            this.allBlocks.push(this.scratchData[i]);
            gl.bindTexture(gl.TEXTURE_2D, this.scratchData[i]);
            gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.FLOAT, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        }
        // Set up the textures
        this.conditionMask = [null];
        this.conditionMaskValue = -1.0;
        this.conditionMaskNotValue = -1.0;

        this.FBO = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.FBO);
        this.fbTex = [this.scratchData[0], this.scratchData[1]];
        gl.framebufferTexture2D(gl.FRAMEBUFFER, this.ext_buff.COLOR_ATTACHMENT0_WEBGL, gl.TEXTURE_2D, this.fbTex[0], 0);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, this.ext_buff.COLOR_ATTACHMENT1_WEBGL, gl.TEXTURE_2D, this.fbTex[1], 0);
        this.ext_buff.drawBuffersWEBGL([
          this.ext_buff.COLOR_ATTACHMENT0_WEBGL, // gl_FragData[0]
          this.ext_buff.COLOR_ATTACHMENT1_WEBGL  // gl_FragData[1]
        ]);

        if(gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE)
        {
            alert("Your browser does not support FLOAT as the color attachment to an FBO");
            return false;
        }

        console.log('GPU acceleration: '+this.qReg.numBlocks+' blocks of '+this.width+'x'+this.height+' each... ok.');
//        console.log('GL block qubits total:'+qReg.numBlockQubits+' '+this.widthQubits+'x'+this.heightQubits+' ok.');
        this.ready = true;
        return true;
    }

    this.allocateNewConditionMask = function()
    {
        var condMask = gl.createTexture();
        this.allBlocks.push(condMask);
        gl.bindTexture(gl.TEXTURE_2D, condMask);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        // TODO: try this as BYTE instead. After it's working
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.FLOAT, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        return condMask;
    }

    this.set_span_args = function(targetBit)
    {
        var span_args = {xspan:0, yspan:0, inv_xspan:0, inv_yspan:0};
        if (targetBit < (1 << this.widthQubits))
        {
            span_args.xspan = 2 * this.width / targetBit;
            span_args.inv_xspan = 1.0 / span_args.xspan;
        }
        else
        {
            span_args.inv_yspan = (targetBit >> this.widthQubits) / this.height;
            span_args.yspan = 1.0 / span_args.inv_yspan;
        }
        return span_args;
    }

    this.debug_print = function(message, buffer)
    {
        if (message == null)
            message = '';
        var w = 6;
        var h = 6;
        w = Math.min(w, this.width);
        h = Math.min(h, this.height);
        temp_array = this.peek_values(null, buffer, w, h);
        console.log('  '+message);
        console.log(temp_array);
    }

    this.peek_values = function(dst, src, width, height, start_x, start_y)
    {
      if  (src == null)
        crash.here();

        if (width == null)
            width = this.width;
        if (height == null)
            height = this.height;
        if (dst == null)
            dst = new Float32Array(new ArrayBuffer(width * height * 4 * 4));
        if (start_x == null)
            start_x = 0;
        if (start_y == null)
            start_y = 0;
        gl.flush();
        // No need for scratch, just process the data into src.
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
    }

    this.createConditionMask = function(condBits, condNotBits)
    {
        if (condBits == this.conditionMaskValue && condNotBits == this.conditionMaskNotValue)
            return;
        this.conditionMaskValue = condBits;
        this.conditionMaskNotValue = condNotBits;
        if (this.debug && this.conditionMask[0])
            this.debug_print('Before createConditionMask('+condBits+', '+condNotBits+'): ', this.conditionMask[0]);
        {
          var maskName = condBits.toString();
          var savedMask = this.savedCondMasks[maskName];
          if (savedMask)
          {
            this.conditionMask[0] = savedMask;
            return;
          }
          else
          {
            this.numSavedCondMasks++;
            console.log('Num cond masks: ' + this.numSavedCondMasks);
            var condMask = this.allocateNewConditionMask();
            this.conditionMask[0] = condMask;
            this.savedCondMasks[maskName] = condMask;
          }
        }
        gl.useProgram(this.prog_qc_condmask1);
        gl.uniform1f(this.arg_condmask1_zeroVal, 1 - (condBits & 1));
        gl.uniform1f(this.arg_condmask1_oneVal, 1 - (condNotBits & 1));
        this.apply(0, 1, null, this.conditionMask, null, false);
        if (this.debug)
            this.debug_print(']]]] ccm1('+condBits+', '+condNotBits+'): ', this.conditionMask[0]);

        gl.useProgram(this.prog_qc_condmask);
        var mask = 2;
        var cbShift = condBits >> 1;
        var cnbShift = condNotBits >> 1;
        while (cbShift || cnbShift)
        {
            var span = this.set_span_args(mask);
            gl.uniform1f(this.arg_condmask_xspan, span.xspan);
            gl.uniform1f(this.arg_condmask_yspan, span.yspan);
            gl.uniform1f(this.arg_condmask_inv_xspan, span.inv_xspan);
            gl.uniform1f(this.arg_condmask_inv_yspan, span.inv_yspan);
            gl.uniform1f(this.arg_condmask_zeroVal, 1 - (cbShift & 1));
            gl.uniform1f(this.arg_condmask_oneVal, 1 - (cnbShift & 1));
            this.apply(0, 1, null, this.conditionMask, null, false);
            if (this.debug)
                this.debug_print(']]]] ccm'+mask+'('+condBits+', '+condNotBits+'): ', this.conditionMask[0]);
            mask <<= 1;
            cbShift >>= 1;
            cnbShift >>= 1;
        }
        if (this.debug)
            this.debug_print('After createConditionMask('+condBits+', '+condNotBits+'): ', this.conditionMask[0]);
    }

    this.apply = function(start, count, src, dst, cond, swap_after, limit_x, limit_y)
    {
        if (limit_x == null)
            limit_x = 1.0;
        if (limit_y == null)
            limit_y = 1.0;
        var restore_viewport = false;
        if (limit_x != 1.0 || limit_y != 1.0)
        {
          // TODO: limit_x and limit_y tell us we can do MUCH less work.
          //       Reduce the drawing area by these factors.
          gl.viewport(0, 0, this.width * limit_x, this.height * limit_y);
          restore_viewport = true;
        }

        var desiredFB0 = this.fbTex[0];
        var desiredFB1 = this.fbTex[1];

        gl.activeTexture(gl.TEXTURE2);
        if (cond)
            gl.bindTexture(gl.TEXTURE_2D, cond[0]);
        else
            gl.bindTexture(gl.TEXTURE_2D, null);

        if (src)
        {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, src[0]);
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.FBO);
            desiredFB0 = dst[0];
            if (count >= 2)
            {
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, src[1]);
                desiredFB1 = dst[1];
            }
            else
              desiredFB1 = null;

            if (this.fbTex[0] != desiredFB0)
            {
              this.fbTex[0] = desiredFB0;
              gl.framebufferTexture2D(gl.FRAMEBUFFER, this.ext_buff.COLOR_ATTACHMENT0_WEBGL, gl.TEXTURE_2D, this.fbTex[0], 0);
            }
            if (this.fbTex[1] != desiredFB1)
            {
              this.fbTex[1] = desiredFB1;
              gl.framebufferTexture2D(gl.FRAMEBUFFER, this.ext_buff.COLOR_ATTACHMENT1_WEBGL, gl.TEXTURE_2D, this.fbTex[1], 0);
            }
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            if (do_gl_flush_timing)
            {
              gl.flush();
              gl.finish();
            }

            if (swap_after)
            {
                // swap src and dst
                for (var i = start; i < start + count; ++i)
                {
                    var temp = dst[i];
                    dst[i] = src[i];
                    src[i] = temp;
                }
            }
        }
        else
        {
            // No need for src, just process the data into dst.
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.FBO);
            desiredFB0 = dst[0];
            if (count >= 2)
              desiredFB1 = dst[1];
            else
              desiredFB1 = null;

            if (this.fbTex[0] != desiredFB0)
            {
              this.fbTex[0] = desiredFB0;
              gl.framebufferTexture2D(gl.FRAMEBUFFER, this.ext_buff.COLOR_ATTACHMENT0_WEBGL, gl.TEXTURE_2D, this.fbTex[0], 0);
            }
            if (this.fbTex[1] != desiredFB1)
            {
              this.fbTex[1] = desiredFB1;
              gl.framebufferTexture2D(gl.FRAMEBUFFER, this.ext_buff.COLOR_ATTACHMENT1_WEBGL, gl.TEXTURE_2D, this.fbTex[1], 0);
            }

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            if (do_gl_flush_timing)
            {
              gl.flush();
              gl.finish();
            }
        }
        if (restore_viewport)
          gl.viewport(0, 0, this.width, this.height);
    }

    this.allocateNewBlock = function()
    {
        return new QCEngineWebGLBlock(this);
    }

    // TODO: revive this to make neat visuals
    this.drawToCanvas = function()
    {
        // Initialize the sources
//        gl.useProgram(this.prog_qc_clear_dual);
//        gl.uniform1f(this.arg_clear_dual_value_at_zero, 1.0);
//        this.apply(0, 2, null, this.srcData);

        // not bit 1
//        gl.useProgram(this.prog_qc_not1_single);
//        this.apply(0, 1, this.srcData, this.scratchData);
//        this.apply(1, 1, this.srcData, this.scratchData);

//        gl.useProgram(this.prog_qc_not1_dual);
//        this.apply(0, 2, this.srcData, this.scratchData);

        // Read the result
        gl.flush();
        if (1) {
            var w = 16;
            var h = 1;
            temp_array = new Float32Array(new ArrayBuffer(w * h * 4 * 4)); // the real component
            gl.readPixels(0, 0, w, h, gl.RGBA, gl.FLOAT, temp_array);
            console.log(temp_array);
        }


        // draw the dst
        gl.useProgram(this.prog_qc_show);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.srcData[0]);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);        
    }
}


function getShader ( gl, name, source, type )
{
   shader = gl.createShader(type);
   gl.shaderSource(shader, source);
   gl.compileShader(shader);
   if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) == 0)
      console.log(name + "\n" + gl.getShaderInfoLog(shader));
   return shader;
}

