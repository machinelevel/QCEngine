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

// Cat colors are used when peeking at values
var catLightColor = "#b8cce4";    // light
var catDarkColor = "#548dd4";     // dark

/////////////////////////////////////////////////////////////////////////////
// The Widget classes
//
//

function Rect(x, y, w, h)
{
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
}
function Vec2(x, y)
{
    this.x = x;
    this.y = y;
    this.length = function()
    {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    this.sqrLength = function()
    {
        return this.x * this.x + this.y * this.y;
    }
    this.normalize = function()
    {
        var len = this.length();
        if (len > 0)
        {
            this.x /= len;
            this.y /= len;
        }
    }
}

// Cheeseball rotation transform
function blochProject(dest, pt, mtx)
{
    dest.x = pt[0] * mtx[0][0] + pt[1] * mtx[0][1] + pt[2] * mtx[0][2];
    dest.y = pt[0] * mtx[1][0] + pt[1] * mtx[1][1] + pt[2] * mtx[1][2];
}

function fillCircle(ctx, x, y, radius, start_degrees, end_degrees, ccw)
{
    if (start_degrees == null)
        start_degrees = 0;
    if (end_degrees == null)
        end_degrees = 360;
    if (ccw == null)
        ccw = true;
    var start_radians = start_degrees * Math.PI / 180.0;
    var end_radians = end_degrees * Math.PI / 180.0;

    ctx.beginPath();
    ctx.arc(x, y, radius, start_radians, end_radians, ccw);
    ctx.closePath();
    ctx.fill();
}

function strokeCircle(ctx, x, y, radius, start_degrees, end_degrees, ccw)
{
    if (start_degrees == null)
        start_degrees = 0;
    if (end_degrees == null)
        end_degrees = 360;
    if (ccw == null)
        ccw = true;
    var start_radians = start_degrees * Math.PI / 180.0;
    var end_radians = end_degrees * Math.PI / 180.0;

    ctx.beginPath();
    ctx.arc(x, y, radius, start_radians, end_radians, ccw);
    ctx.closePath();
    ctx.stroke();
}

function drawKetText(ctx, text, x, y, lineWidth, textSize)
{
    ctx.fillText(text, x, y);
    var w = ctx.measureText(text).width;
    var h = textSize - 2;
	var x1 = x - 2 - w / 2;
	var x2 = x + 2 + w / 2;
	var x3 = x2 + h / 4;
	var y1 = y + 4; // it looks like this is platform dependent
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

function QWidgetImage(name)
{
    var img = new Image();
    img.src = name;
    img.onload = ImageLoaded;
    return img;
}

function SmallDial(x, y)
{
    this.x = x;
    this.y = y;
    this.count = 0;
    return this;
}

function QStopwatch(qReg, bitMask, panel, pos)
{
    this.qReg = qReg;
    this.panel = panel;
    this.bitMask = bitMask;
    this.pos = new Vec2(pos.x, pos.y);
    this.scale = 1.0;

    this.dialX = 294 * 0.5;
    this.dialY = 534 * 0.5;
    this.dialCenterPos = function()
    {
        return new Vec2(this.dialX * this.scale, this.dialY * this.scale);
    }
    
    this.dialRadius = 170 * 0.5;
    this.resultDial = new Array();
    this.resultDial.push(new SmallDial(368 * 0.5, 582 * 0.5));
    this.resultDial.push(new SmallDial(211 * 0.5, 530 * 0.5));
    this.dialBounce = true;

    this.imgOpen = new QWidgetImage("images/gold_watch_open8_301.png");
    this.imgClosed = new QWidgetImage("images/gold_watch_closed_301.png");

    qReg.widgets.push(this);
    panel.widgets.push(this);

    this.draw = function()
    {
//        this.scale = this.panel.width / 350;

        var ctx = this.panel.canvas.getContext('2d');
        ctx.save();
        {
            var isOpen = this.qReg.classicalBitValid(this.bitMask);
            var img = this.imgClosed;
            if (isOpen)
                img = this.imgOpen;
            if (img != null && img.width > 0)
            {
                this.size = new Vec2(img.width * this.scale, img.height * this.scale);
                try { ctx.drawImage(img, this.pos.x, this.pos.y, this.size.x, this.size.y); }
                catch (e) { }

                if (isOpen || this.qReg.catVisible)
                {
                    // Draw the hand
                    var cx = this.pos.x + this.scale * this.dialX;
                    var cy = this.pos.y + this.scale * this.dialY;
                    var handLength = this.scale * this.dialRadius;
                    var thetaDeg = -30 + 90;
                    if (isOpen)
                    {
                        if (this.qReg.classicalBit(this.bitMask))
                            thetaDeg -= 90;
                    }
                    else
                    {
                        thetaDeg -= 90 * this.qReg.peekQubitProbability(this.bitMask);
                    }
                    var thetaRad = thetaDeg * Math.PI / 180.0;
                    var sval = Math.sin(thetaRad);
                    var cval = Math.cos(thetaRad);

    //                console.log(thetaDeg + " " + thetaRad + " " + sval + " " + cval);

                    // Draw the big hand
                    ctx.save();
                    {
                        ctx.beginPath();
                        ctx.moveTo(cx, cy);
                        ctx.lineTo(cx + sval * handLength, cy - cval * handLength);
                        if (isOpen)
                        {
                            ctx.lineWidth = 2;
                            ctx.strokeStyle = "#000000";
                            ctx.stroke();
                        }
                        else
                        {
                            ctx.globalAlpha = 0.05;
                            ctx.strokeStyle = "#ffffff";
                            ctx.lineCap = "round";
                            for (var i = 30; i > 2; i -= 2)
                            {
                                ctx.lineWidth = i;
                                ctx.stroke();
                            }

                            ctx.globalAlpha = 1.0;
                            ctx.strokeStyle = catLightColor;    // light
                            ctx.strokeStyle = catDarkColor;    // dark
                            ctx.lineWidth = 2;
                            ctx.stroke();
                        }
                    }
                    ctx.restore();

                    // draw the little hands
                    if (isOpen)
                    {
                        for (var hand = 0; hand < 2; ++hand)
                        {
                            var shortLengh = this.scale * 40 * 0.5;
                            var thetaDeg = -30 + (this.resultDial[hand].count * 360.0 / 60.0);
                            var thetaRad = thetaDeg * Math.PI / 180.0;
                            var sval = Math.sin(thetaRad);
                            var cval = Math.cos(thetaRad);
                            var cx = this.pos.x + this.scale * this.resultDial[hand].x;
                            var cy = this.pos.y + this.scale * this.resultDial[hand].y;
                            ctx.save();
                            {
                                ctx.beginPath();
                                ctx.lineTo(cx - sval * shortLengh * 0.5, cy + cval * shortLengh * 0.5);
                                ctx.lineTo(cx + sval * shortLengh, cy - cval * shortLengh);
                                ctx.lineWidth = 1;
                                ctx.strokeStyle = "#000000";
                                ctx.stroke();
                            }
                            ctx.restore();
                        }
                    }
                }
            }
        }
        ctx.restore();
    }

	this.changed = function ()
	{
        this.draw();
	}

    
	this.message = function (msg, bitMask, arg1)
	{
        if ((bitMask & this.bitMask) != 0)
        {
            if (msg == "incrementResultDial")
            {
                if (arg1)
                    this.resultDial[1].count++;
                else
                    this.resultDial[0].count++;
                this.draw();
            }
        }
	}

	this.mouseDown = function (x, y)
	{
        if (x >= 0 && y >= 0 && x < this.size.x && y < this.size.y)
        {
//            console.log("clickedrect " + x + "," + y);
            var dx = x - this.scale * this.dialX;
            var dy = y - this.scale * this.dialY;
            if (dx * dx + dy * dy <= this.scale * this.dialRadius * this.scale * this.dialRadius)
            {
//            console.log("clicked " + x + "," + y);
                if (this.qReg.classicalBitValid(this.bitMask))
                    this.qReg.invalidateClassicalBits(this.bitMask); // just close
                else
                    this.qReg.read(this.bitMask); // open
                this.qReg.changed();
                return true;
            }
        }
        return false;
    }

    this.mouseUp = function (x, y)
    {
    }

    this.mouseMove = function (x, y)
    {
    }

}

function QCat(qReg, panel, pos)
{
    this.qReg = qReg;
    this.panel = panel;
    this.scale = 1.0;
    this.pos = new Vec2(pos.x, pos.y);

    this.imgVisible = new QWidgetImage("images/cat_in_box_35.png");
    this.imgHidden = new QWidgetImage("images/opaque_box_35.png");

    qReg.widgets.push(this);
    panel.widgets.push(this);

    this.draw = function()
    {
        var ctx = this.panel.canvas.getContext('2d');
        ctx.save();
        {
            var img = this.imgHidden;
            if (this.qReg.catVisible)
                img = this.imgVisible;
            if (img != null && img.width > 0)
            {
                this.size = new Vec2(img.width * this.scale, img.height * this.scale);
                try { ctx.drawImage(img, this.pos.x, this.pos.y, this.size.x, this.size.y); }
                catch (e) { }
            }
        }
        ctx.restore();
    }

	this.changed = function ()
	{
        this.draw();
	}

  	this.message = function (msg, bitMask, arg1)
	{
	}

	this.mouseDown = function (x, y)
	{
        if (x >= 0 && y >= 0 && x < this.size.x && y < this.size.y)
        {
            this.qReg.toggleCat();
            return true;
        }
        return false;
    }

    this.mouseUp = function (x, y)
    {
    }

    this.mouseMove = function (x, y)
    {
    }

}


function QCharm(qReg, panel, pos, imageName)
{
    this.qReg = qReg;
    this.panel = panel;
    this.scale = 1.0;
    this.pos = new Vec2(pos.x, pos.y);
    this.size = new Vec2(1, 1); // image will fill it in
    this.labelSize = new Vec2(0, 0);

    this.isHovered = false;   // Mouse is over me
    this.isClicked = false;   // Mouse was clicked while hovered was true

    this.image = new QWidgetImage(imageName);

    qReg.widgets.push(this);
    panel.widgets.push(this);

    this.draw = function()
    {
        var ctx = this.panel.canvas.getContext('2d');
        ctx.save();
        {
            // erase the rect
            ctx.save();
            {
                var centerx = this.pos.x + this.size.x * 0.5;
                var textHeight = this.labelSize.y;
                var textWidth = this.labelSize.x;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(this.pos.x, 
                             this.pos.y, 
                             this.size.x, 
                             this.size.y);
                // erase the text
                ctx.fillRect(centerx - textWidth * 0.5, 
                             this.pos.y + this.size.y, 
                             textWidth, 
                             textHeight);
            }
            ctx.restore();

            var img = this.image;
            if (img != null && img.width > 0)
            {
                this.size = new Vec2(img.width * this.scale, img.height * this.scale);
                try { ctx.drawImage(img, this.pos.x, this.pos.y, this.size.x, this.size.y); }
                catch (e) { }

                var hx = 0.5 * this.size.x;
                var hy = 0.5 * this.size.y;
                var cx = this.pos.x + hx;
                var cy = this.pos.y + hy;

                if (this.isClicked && this.isHovered)
                {
                    ctx.save();
//                    ctx.lineWidth = 2;
                    ctx.fillStyle = "#ffffff";
                    ctx.globalAlpha = 0.5;
                    fillCircle(ctx, cx, cy, hx - 4, hy - 4);
                    ctx.restore();
                }

                // Draw the label text
                if (this.isClicked || this.isHovered)
                {
                    ctx.font = '9px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    var x = cx;
                    var y = this.pos.y + this.size.y;
                    ctx.fillText(this.label, x, y);
                    this.labelSize.x = ctx.measureText(this.label).width + 2;
                    this.labelSize.y = 9+2;
                }
            }
        }
        ctx.restore();
    }

	this.changed = function ()
	{
        this.draw();
	}

  	this.message = function (msg, bitMask, arg1)
	{
	}

	this.clickAction = function (x, y)
	{
        // empty default
	}

    this.checkHovered = function(x, y)
    {
        var radius = this.size.x * 0.5;
        var dx = x - radius;
        var dy = y - radius;

        this.isHovered = ((dx * dx) + (dy * dy) <= radius * radius);
        return this.isHovered;
    }

	this.mouseDown = function (x, y)
	{
        var handled = false;
        if (this.checkHovered(x, y))
        {
            this.isClicked = true;
            this.draw();
            handled = true;
        }
        return handled;
    }

	this.mouseUp = function (x, y)
	{
        var wasHovered = this.isHovered;
        var wasClicked = this.isClicked;
        if (this.checkHovered(x, y))
        {
            if (this.isClicked)
            {
                this.clickAction(x, y);
            }
        }
        this.isClicked = false;
        if (wasHovered || wasClicked)
            this.draw();
        return false;   // make sure everyone else gets mouseups
    }

	this.mouseMove = function (x, y)
	{
        var wasHovered = this.isHovered;
        if (this.checkHovered(x, y) != wasHovered)
        {
            this.draw();
        }
        return false;   // make sure everyone else gets mousemoves
    }

}

function QNotCharm(qReg, panel, pos, bitMask, label)
{
    var charm = new QCharm(qReg, panel, pos, "images/not_charm_35.png");
    charm.bitMask = bitMask;
    charm.label = label;

	charm.clickAction = function (x, y)
	{
        if (charm.qReg.staff)
            charm.qReg.staff.addInstructionAfterInsertionPoint('not', charm.bitMask, 0, 0);
//        charm.qReg.not(charm.bitMask);
	}
    return charm;
}

function QRotateCharm(qReg, panel, pos, bitMask, label)
{
    var charm = new QCharm(qReg, panel, pos, "http://machinelevel.com/qc/images/rotate_charm_35.png");
    charm.bitMask = bitMask;
    charm.label = label;

	charm.clickAction = function (x, y)
	{
        charm.qReg.rotate(charm.bitMask, 20);
	}
    return charm;
}

function QHadamardCharm(qReg, panel, pos, bitMask, label)
{
    var charm = new QCharm(qReg, panel, pos, "images/hadamard_charm_35.png");
    charm.bitMask = bitMask;
    charm.label = label;

	charm.clickAction = function (x, y)
	{
        charm.qReg.hadamard(charm.bitMask);
	}
    return charm;
}

function QPhaseShiftCharm(qReg, panel, pos, bitMask, label)
{
    var charm = new QCharm(qReg, panel, pos, "images/phase_charm_35.png");
    charm.bitMask = bitMask;
    charm.label = label;

	charm.clickAction = function (x, y)
	{
        charm.qReg.phaseShift(charm.bitMask, 0, 20);
	}
    return charm;
}

function QCoinTossCharm(qReg, panel, pos, bitMask, label)
{
    var charm = new QCharm(qReg, panel, pos, "images/cointoss_charm_35.png");
    charm.bitMask = bitMask;
    charm.label = label;

	charm.clickAction = function (x, y)
	{
        var wasObserved = charm.qReg.classicalBitValid(charm.bitMask);

        charm.qReg.read(charm.bitMask);
        charm.qReg.hadamard(charm.bitMask);
        charm.qReg.read(charm.bitMask);

        // let the cointoss listeners update
        charm.qReg.message("incrementResultDial",
                            charm.bitMask,
                            charm.qReg.classicalBit(charm.bitMask));
        if (! wasObserved)
        {
            charm.qReg.invalidateClassicalBits(charm.bitMask); // it was closed, so cloae it
        }
        charm.qReg.changed();
	}
    return charm;
}

// This isn't efficient, for now.
function rainbow_color(zero_to_one)
{
    var theta = 2 * Math.PI * zero_to_one;
    var r = Math.floor(Math.sin(theta + 0.0 * Math.PI / 3.0) * 127 + 128);
    var g = Math.floor(Math.sin(theta + 2.0 * Math.PI / 3.0) * 127 + 128);
    var b = Math.floor(Math.sin(theta + 4.0 * Math.PI / 3.0) * 127 + 128);
    return 'RGB('+r+','+g+','+b+')';
}

function QChart(qReg, panel, pos)
{
    this.qInt = null;
    this.qReg = qReg;
    this.panel = panel;
    this.pos = new Vec2(pos.x, pos.y);
    this.width = 0;
    this.height = 0;
    if (this.panel.canvas)
    {
        this.width = this.panel.canvas.width - pos.x;
        this.height = this.panel.canvas.height - pos.y;
    }
    this.visible = true;
    this.in_use = true;
    this.hovered_fock_circle = -1;

//    this.menu_margin = {x:0, y:60};
    this.margin = {x:10, y:30};
    this.prevXYValues = new Array();

    this.barTextSize = 14;
    this.barHeight = this.barTextSize + 10;

    this.scale = 0.75;
    this.baseScale = 0.5;
    this.wheelScale = 1.0;  // changes with mousewheel
    this.magScale = 1.0;    // circle normalization
    this.autoMagScale = false;
    this.bloch_view_azimuth = -120.0;

//    this.size = new Vec2(300, 200);

    this.qReg.widgets.push(this);
    panel.widgets.push(this);

    this.calculateDimensions = function()
    {
        this.scale = this.baseScale;
        if (qc_options && qc_options.circle_scale)
            this.scale = qc_options.circle_scale;
        this.scale *= this.wheelScale;

        this.circleRadius = 50;
        this.columnWidth = this.circleRadius * 2.5;
        this.columnHeight = this.circleRadius * 2.5;

        if (this.blochSphere)
        {
            var sphere_scale = 3;
            this.circleRadius *= sphere_scale;
            this.columnWidth *= sphere_scale;
            this.columnHeight *= sphere_scale;
        }

        if (this.graphState)
        {
            if (this.qReg.ballistic_lattice)
            {
                this.columnWidth *= 1.0 * (this.qReg.ballistic_lattice.num_slices + 0.5 * this.qReg.ballistic_lattice.slice_width);
                this.columnHeight *= 0.75 * (this.qReg.ballistic_lattice.slice_height + 0.5 * this.qReg.ballistic_lattice.slice_width);
            }
            else
            {
                var graph_scale = 5;
                this.circleRadius *= graph_scale;
                this.columnWidth *= graph_scale;
                this.columnHeight *= graph_scale;
            }
        }

        this.width = 0;
        this.height = 0;
        if (this.fockState && !this.qReg.use_photon_sim)
            return;
        if (this.stabilizerState && !(this.qReg.chp && this.qReg.chp.active))
            return;
        if (this.drawQInt && this.drawQInt.ui_hidden)
            return;
        if (this.densityMatrix && this.qReg.disableSimulation)
            return;

        // Now set the y position
        var space_between_widgets = 5;
        var total_height = space_between_widgets;
        var list = this.panel.widgets;
        for (var i = 0; i < list.length && list[i] != this; ++i)
        {
            if (list[i].height)
                total_height += list[i].height + space_between_widgets;
        }
        this.pos.y = total_height;

        // Decide if we're offscreen
        if (!this.panel.canvas)
            return;
        if (!this.in_use
            || this.pos.x >= this.panel.canvas.width
            || this.pos.y >= this.panel.canvas.height)
        {
            this.visible = false;
            return;
        }
        this.visible = true;

        this.width = this.panel.canvas.width - this.pos.x;
        this.height = this.panel.canvas.height - this.pos.y;
        var num_vals_to_draw = this.numValues;
        if (this.drawQInt)
            num_vals_to_draw = 1 << this.drawQInt.numBits;
        else if (this.densityMatrix)
            num_vals_to_draw *= num_vals_to_draw;
        else if (this.fockState)
        {
            this.qReg.photonSim.findNonZeroStates();
            num_vals_to_draw = this.qReg.photonSim.non_zero_states.length;
        }
        else if (this.stabilizerState)
        {
            num_vals_to_draw = this.qReg.numQubits * this.qReg.numQubits * 2;
        }
        else if (this.blochSphere)
        {
            num_vals_to_draw = this.qReg.numQubits;
        }
        else if (this.graphState)
        {
            num_vals_to_draw = 1;
        }

        this.numCols = this.width / (this.columnWidth * this.scale);
        this.numRows = this.height / (this.columnHeight * this.scale);

        var qubitsPerRow = -1;
        for (var i = 0; qubitsPerRow < 0; ++i) {
            if (this.numCols < ((1 << (i + 1)) * 0.75))
                qubitsPerRow = i;
        }
        this.numCols = 1 << qubitsPerRow;

        if (this.densityMatrix && this.numCols > this.numValues)
            this.numCols = this.numValues;

        if (this.stabilizerState)
        {
            this.numCols = 2 * this.qReg.numQubits;
            this.numRows = this.qReg.numQubits;
        }

        if (this.numCols > num_vals_to_draw)
            this.numCols = num_vals_to_draw;
        if (this.numRows > Math.ceil(num_vals_to_draw / this.numCols))
            this.numRows = Math.ceil(num_vals_to_draw / this.numCols);

        this.numRows = Math.ceil(this.numRows);
        var usedWidth = this.margin.x * this.wheelScale + this.columnWidth * this.numCols * this.scale;
        var usedHeight = this.margin.y * this.wheelScale + this.columnHeight * this.numRows * this.scale;
        if (this.height > usedHeight)
            this.height = usedHeight;
        if (this.width > usedWidth)
            this.width = usedWidth;
        if (this.collapsed)
            this.height = this.barHeight;
//        console.log('numCols = ' + this.numCols);
    }

    this.rebuildIntMenu = function()
    {
        var need_redraw = false;
        var index = 0;
        if (this.panel.int_menu_select)
        {
            this.panel.int_menu_select.options[index++] = new Option("raw register", "(raw)");
            var options = this.qReg.getQubitIntMenuArray();
            for (var i = 0; i < options.length; ++i)
                if (options[i].text.length > 0 && options[i].text[0] != '(')
                    this.panel.int_menu_select.options[index++] = options[i];
            panel.int_menu_select.options.length = index;
            panel.int_menu_select.onchange = this.selectIntMenu;
        }
        var extra_widgets = 6;
        while (this.panel.widgets.length < this.qReg.qInts.length + extra_widgets)
        {
            new QChart(this.qReg, panel, new Vec2(0, 0));
            need_redraw = true;
        }
        var qints = this.qReg.qInts;
        var list = this.panel.widgets;
        var index = 0;
        for (var key in qints)
        {
            var qint = qints[key];
//            if (!qint.ui_hidden)
            {
                list[index].in_use = true;
                list[index].drawQInt = qint;
                list[index].densityMatrix = false;
                list[index].fockState = false;
                list[index].stabilizerState = false;
                list[index].blochSphere = false;
                list[index].graphState = false;
                list[index].stateVector = false;
                list[index].collapsed = true;
                index++;
            }
        }
        // Density matrix widget
        list[index].in_use = true;
        list[index].drawQInt = null;
        list[index].densityMatrix = true;
        list[index].fockState = false;
        list[index].stabilizerState = false;
        list[index].blochSphere = false;
        list[index].graphState = false;
        list[index].stateVector = false;
        list[index].collapsed = true;
        index++;
        // Bloch Sphere
        list[index].in_use = true;
        list[index].drawQInt = null;
        list[index].densityMatrix = false;
        list[index].fockState = false;
        list[index].stabilizerState = false;
        list[index].blochSphere = true;
        list[index].graphState = false;
        list[index].stateVector = false;
        list[index].collapsed = true;
        if (qc_options.widget_open_bloch)
            list[index].collapsed = false;
        index++;
        // Graph State
        list[index].in_use = true;
        list[index].drawQInt = null;
        list[index].densityMatrix = false;
        list[index].fockState = false;
        list[index].stabilizerState = false;
        list[index].blochSphere = false;
        list[index].graphState = true;
        list[index].stateVector = false;
        list[index].collapsed = true;
        if (this.qReg.ballistic_lattice)
            list[index].collapsed = false;
        index++;
        // State vector widget
        list[index].in_use = true;
        list[index].drawQInt = null;
        list[index].densityMatrix = false;
        list[index].fockState = false;
        list[index].stabilizerState = false;
        list[index].blochSphere = false;
        list[index].graphState = false;
        list[index].stateVector = true;
        list[index].collapsed = true;
        index++;
        // Fock State
        list[index].in_use = true;
        list[index].drawQInt = null;
        list[index].densityMatrix = false;
        list[index].fockState = true;
        list[index].stabilizerState = false;
        list[index].blochSphere = false;
        list[index].graphState = false;
        list[index].stateVector = false;
        list[index].collapsed = false;
        index++;
        // Stabilizer State
        list[index].in_use = true;
        list[index].drawQInt = null;
        list[index].densityMatrix = false;
        list[index].fockState = false;
        list[index].stabilizerState = true;
        list[index].blochSphere = false;
        list[index].graphState = false;
        list[index].stateVector = false;
        list[index].collapsed = false;
        index++;

        while (index < list.length)
            list[index++].in_use = false;
//        if (need_redraw)
//            this.panel.draw();
    }

    this.selectIntMenu = function()
    {
        this.prevXYValues = new Array();
        DrawAllPanels();
    }

    this.circleItem = function()
    {
//function sortNumber(a,b)
//{
//return a - b;
//}
    }

    this.currCircleList = new Array();
    this.prevCircleList = new Array();

    this.panel.animationTotalTimeSec = 0.3;
    this.panel.animationRemainingTimeSec = 0;
    this.panel.animationIntervalMS = 30;
    this.panel.animationInstruction = null;


    this.qIntsChanged = function()
    {
        this.rebuildIntMenu();
    }

    this.drawValueCircle = function(ctx, x, y, cval, cval_array)
    {
        var probability = cval.sqrLength();
        var vector_len = cval ? cval.length() : 0;
        var tiny_vector_len = (vector_len < 0.000001);
        var radius2 = this.circleRadius * vector_len * this.magScale;
        var lod_scale = 0.2;
        var tiny_scale = (this.wheelScale < lod_scale);
        var ok_to_color = true;

//        ctx.fillStyle = "#ffffff";
//        fillCircle(ctx, 0, 0, this.circleRadius);

        if (!tiny_vector_len)
        {
            if (qc_options.color_by_phase && !tiny_vector_len && (1 || !cval_array))
            {
                x = cval.x;
                y = cval.y;
                if (cval_array && cval_array.length)
                {
                    x = cval_array[0].x;
                    y = cval_array[0].y;
                    var len = Math.sqrt(x * x + y * y);
                    x = x * vector_len / len;
                    y = y * vector_len / len;
                }
                var r = 0|(255 * 0.5 * ((x / vector_len) + 1));
                var g = 0|(255 - r);
                var b = 0|(255 * 0.5 * ((y / vector_len) + 1));

                if (qc_options.book_render)
                {
                    //qc_cwest  = [193/255.0, 53/255.0, 228/255.0]; // purplish
                    //qc_cnorth = [186/255.0, 78/255.0, 121/255.0]; // reddish
                    //qc_csouth = [87/255.0, 112/255.0, 255/255.0]; // bluish
                    //qc_ceast =  [245/255.0, 204/255.0, 78/255.0]; // sunny

                    // qc_cwest  = [132/255.0, 37/255.0, 157/255.0]; // purplish
                    // qc_cnorth = [186/255.0, 78/255.0, 121/255.0]; // reddish
                    // qc_csouth = [15/255.0, 17/255.0, 132/255.0]; // bluish
                    // qc_ceast =  [245/255.0, 204/255.0, 78/255.0]; // sunny

                    qc_csouth  = [193/255.0, 53/255.0, 228/255.0]; // purplish
                    qc_cnorth = [186/255.0, 78/255.0, 121/255.0]; // reddish
                    qc_cwest = [87/255.0, 112/255.0, 255/255.0]; // bluish
                    qc_ceast =  [245/255.0, 204/255.0, 78/255.0]; // sunny

                    var desaturate = 0.5;
                    for (var i = 0; i < 3; ++i)
                    {
                        qc_cnorth[i] = qc_cnorth[i] + desaturate * (0.75 - qc_cnorth[i]);
                        qc_csouth[i] = qc_csouth[i] + desaturate * (0.75 - qc_csouth[i]);
                        qc_ceast[i] = qc_ceast[i] + desaturate * (0.75 - qc_ceast[i]);
                        qc_cwest[i] = qc_cwest[i] + desaturate * (0.75 - qc_cwest[i]);
                    }

                    if (qc_options.qc_cwest)
                        qc_cwest = qc_options.qc_cwest;
                    if (qc_options.qc_cwest)
                        qc_ceast = qc_options.qc_ceast;
                    if (qc_options.qc_cwest)
                        qc_cnorth = qc_options.qc_cnorth;
                    if (qc_options.qc_cwest)
                        qc_csouth = qc_options.qc_csouth;

                    c = [0.0, 0.0, 0.0];
                    xx = x / vector_len;
                    yy = y / vector_len;

//                    console.log('xx: '+xx+' yy: '+yy);
                    if (yy > 0)
                    {
                        for (var i = 0; i < 3; ++i)
                            c[i] += yy * yy * qc_ceast[i];
                    }
                    else
                    {
                        for (var i = 0; i < 3; ++i)
                            c[i] += yy * yy * qc_cwest[i];
                    }
                    if (xx > 0)
                    {
                        // console.log('qc_cnorth '+qc_cnorth)
                        // console.log('qc_cnorth '+(qc_cnorth[0]*255)+' '+(qc_cnorth[1]*255)+' '+(qc_cnorth[2]*255)+' ')
                        for (var i = 0; i < 3; ++i)
                            c[i] += xx * xx * qc_cnorth[i];
                    }
                    else
                    {
                        for (var i = 0; i < 3; ++i)
                            c[i] += xx * xx * qc_csouth[i];
                    }
                    r = 0|(255 * c[0]);
                    g = 0|(255 * c[1]);
                    b = 0|(255 * c[2]);
                    // console.log('rgb: '+r+' '+g+' '+b);
                }

                // See if we shoulf blank out the color
                if (cval_array && cval_array.length > 1)
                {
                    // Merge to show color if possible
                    if (cval_array.length > 100)
                    {
                        ok_to_color = false;
                    }
                    {
                        for (var i = 1; i < cval_array.length && ok_to_color; ++i)
                        {
                            xi = cval_array[i].x;
                            yi = cval_array[i].y;
                            var leni = Math.sqrt(xi * xi + yi * yi);
                            xi = xi * vector_len / leni;
                            yi = yi * vector_len / leni;
                            var ri = 0|(255 * 0.5 * ((xi / vector_len) + 1));
                            var gi = 0|(255 - ri);
                            var bi = 0|(255 * 0.5 * ((yi / vector_len) + 1));
                            if (ri != r || gi != g || bi != b)
                                ok_to_color = false;
                        }
                    }
                }
                if (ok_to_color)
                    ctx.fillStyle = 'RGB('+r.toFixed(0)+', '+g.toFixed(0)+', '+b.toFixed(0)+')';
                else
                    ctx.fillStyle = catLightColor;
            }
            else
            {
                ctx.fillStyle = catLightColor;
            }
            if (tiny_scale)
                ctx.fillRect(-radius2, -radius2, 2*radius2, 2*radius2);
            else
                fillCircle(ctx, 0, 0, radius2);
        }

        ctx.lineWidth = 2;
        ctx.strokeStyle = "#444";
//        if (tiny_scale)
//            ctx.strokeRect(-this.circleRadius, -this.circleRadius, 2*this.circleRadius, 2*this.circleRadius);
//        else
            strokeCircle(ctx, 0, 0, this.circleRadius);

        var book = qc_options.book_render;
        //book = true;

        if (!tiny_scale)
        {
            // long phase line
            if (cval_array)
            {
                ctx.lineWidth = 0.25;
                if (book)
                    ctx.lineWidth = 2.0;
                ctx.strokeStyle = 'black';
                ctx.beginPath();
                for (var i = 0; i < cval_array.length; ++i)
                {
                    var len = cval_array[i].length();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(cval_array[i].y * this.circleRadius / len,
                              -cval_array[i].x * this.circleRadius / len);
                }
                ctx.stroke();
                // if (book)
                // {
                //     save_fill = ctx.fillStyle;
                //     ctx.fillStyle = 'black';
                //     for (var i = 0; i < cval_array.length; ++i)
                //     {
                //         var bcx =  cval_array[i].y * this.circleRadius / vector_len;
                //         var bcy = -cval_array[i].x * this.circleRadius / vector_len;
                //         var bcr = this.circleRadius * 0.2;
                //         fillCircle(ctx, bcx, bcy, bcr);
                //     }
                //     ctx.fillStyle = save_fill;
                // }
            }
            else
            {
                if (radius2 > 0.0 && !tiny_vector_len)
                {
                    ctx.lineWidth = 0.25;
                    if (book)
                        ctx.lineWidth = 2.0;
                    ctx.strokeStyle = 'black';
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(cval.y * this.circleRadius / vector_len,
                              -cval.x * this.circleRadius / vector_len);
                    ctx.stroke();
                    if (book)
                    {
                        save_fill = ctx.fillStyle;
                        ctx.fillStyle = 'black';
                        var bcx =  cval.y * this.circleRadius / vector_len;
                        var bcy = -cval.x * this.circleRadius / vector_len;
                        var bcr = this.circleRadius * 0.1;
                        fillCircle(ctx, bcx, bcy, bcr);
                        ctx.fillStyle = save_fill;
                    }
                }
            }
        }
        // phase line and circle
        if (radius2 > 0.0) {
            ctx.lineWidth = 3;
            ctx.strokeStyle = catDarkColor;
            if (book)
            {
                ctx.lineWidth = 2.0;
                ctx.strokeStyle = 'black';
            }
            if (tiny_scale)
                ctx.fillRect(-radius2, -radius2, 2*radius2, 2*radius2);
            else
                fillCircle(ctx, 0, 0, radius2);

            if (!tiny_scale)
            {
                if (!tiny_vector_len)
                {
                    if (cval_array)
                    {
                        if (cval_array.length && ok_to_color)
                        {
                            ctx.beginPath();
                            ctx.lineTo(0, 0);
                            ctx.lineTo(cval_array[0].y * this.magScale * this.circleRadius,
                                      -cval_array[0].x * this.magScale * this.circleRadius);
                            ctx.stroke();
                        }
                    }
                    else
                    {
                        ctx.beginPath();
                        ctx.lineTo(0, 0);
                        ctx.lineTo(cval.y * this.magScale * this.circleRadius,
                                  -cval.x * this.magScale * this.circleRadius);
                        ctx.stroke();
                    }
                }
            }
        }
    }

    this.drawValueCircleText = function(ctx, x, y, cval, cval_array, ketVal)
    {
        // Draw the label text
        var probability = cval.sqrLength();
        var textsize = 20;
        ctx.strokeStyle = "#000000";
        ctx.fillStyle = "#000000";

        ctx.font = 'bold '+textsize+'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        var x = 0;
        var y = 0 + this.circleRadius * 1.025;
        var lineHeight = 18;
        if (this.densityMatrix)
        {
            var dm_row = 0|(ketVal / this.numValues);
            var dm_col = ketVal % this.numValues;
            ketVal = '' + dm_row + ':' + dm_col;
        }
        drawKetText(ctx, ketVal, x, y, 1, textsize);
//      y += lineHeight;

        x = y = 0;
        var y = 0 + 0.5 * this.circleRadius;
        ctx.globalAlpha = 0.25;
        if (qc_options.show_prob_text)
            ctx.fillText((probability * 100).toFixed(1) + '%', x, y);
        ctx.globalAlpha = 1.0;
    }

    this.set_graph_node_positions = function() {
        var node_pos = [];
        var detect_ballistics = true;
        var use_ballistics = false;
        var num_qubits = this.qReg.numQubits;
        var staff = this.qReg.staff;
        var instructions = this.qReg.staff.instructions;
        var inst_index = this.qReg.staff.insertionStart;
        var major_radius = 0.35 * Math.min(this.columnWidth, this.columnHeight);
        if (detect_ballistics)
        {
            if (instructions.length > inst_index)
            {
                var inst = instructions[inst_index];
                if (inst.op == 'read' || inst.op == 'postselect')
                    use_ballistics = true;
            }
        }
        // Arrange them in one big circle by default
        for (bit = 0; bit < num_qubits; ++bit)
        {
            var pos_theta = 2 * Math.PI * bit / num_qubits;
            var sval = Math.sin(pos_theta);
            var cval = Math.cos(pos_theta);
            var cx = major_radius * (0.3 + sval);
            var cy = major_radius * (0.3 - cval);
            node_pos.push([cx, cy]);
        }
        if (use_ballistics)
        {
            for (bit = 0; bit < num_qubits; ++bit)
            {
                node_pos[bit][1] = 0;
            }
        }

        this.prev_node_pos = node_pos;
        return node_pos;
    }

    this.drawXYCircles = function (ctx) {
//        if (this.drawQInt)
//            console.log('Drawing for ' + this.drawQInt.name);
//        else
//            console.log('Drawing full state');

        if (this.fockState && !this.qReg.use_photon_sim)
            return;
        if (this.stabilizerState && !(this.qReg.chp && this.qReg.chp.active))
            return;
        if (this.drawQInt && this.qReg.disableSimulation)
            return;
        if (this.stateVector && this.qReg.disableSimulation)
            return;

        ctx.save();

        ctx.fillStyle = "white";
        ctx.fillRect(this.pos.x, this.pos.y, this.width, this.height);
        ctx.lineWidth = 1;
//        ctx.strokeStyle = "red";
//        ctx.strokeRect(this.pos.x, this.pos.y, this.width, this.height);
//        ctx.strokeStyle = "black";
        ctx.beginPath();
        ctx.rect(this.pos.x, this.pos.y, this.width, this.height);
        ctx.clip();

        {
            // Draw the qint name
            var str = 'state vector';
            ctx.fillStyle = "#def";

            if (this.drawQInt)
                str = this.drawQInt.name;
            else if (this.densityMatrix)
                str = 'density matrix';
            else if (this.blochSphere)
                str = 'Bloch sphere';
            else if (this.graphState)
                str = 'Graph state';
            else if (this.fockState)
            {
                str = 'Fock states';
                ctx.fillStyle = '#4f8';
                ctx.globalAlpha = 0.25;
            }
            else if (this.stabilizerState)
            {
                str = 'stabilizer state';
                ctx.fillStyle = '#C38EFF';
                ctx.globalAlpha = 0.25;
            }

            ctx.font = 'bold '+this.barTextSize+'px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            var x = this.pos.x;
            var y = this.pos.y;
            ctx.fillRect(x, y, this.width, this.barHeight);
            ctx.globalAlpha = 1.0;
            x += this.barHeight;
            y += 5;
            ctx.fillStyle = "black";
            ctx.fillText(str, x, y);

            // Draw the bellows
            var arrow_offset = this.barHeight / 2;
            var arrow_size = this.barHeight / 4;
            var rx = arrow_size * 0.6;
            var ry = arrow_size * 1.0;
            var cx = this.pos.x + arrow_offset;
            var cy = this.pos.y + arrow_offset;
            ctx.strokeStyle = "black";
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            if (this.collapsed)
            {
                ctx.moveTo(cx - rx, cy - ry);
                ctx.lineTo(cx - rx, cy + ry);
                ctx.lineTo(cx + rx, cy);
                ctx.lineTo(cx - rx, cy - ry);
            }
            else
            {
                ctx.moveTo(cx - ry, cy - rx);
                ctx.lineTo(cx + ry, cy - rx);
                ctx.lineTo(cx, cy + rx);
                ctx.lineTo(cx - ry, cy - rx);
            }
            ctx.stroke();
            ctx.lineWidth = 1;
            this.collapse_x = cx - this.pos.x;
            this.collapse_y = cy - this.pos.y;
        }

        ctx.restore();

        if (this.collapsed)
            return;

        ctx.save();

        ctx.translate(this.pos.x + this.margin.x * this.wheelScale,
                      this.pos.y + this.margin.y * this.wheelScale);
        ctx.scale(this.scale, this.scale);
        ctx.translate(this.circleRadius,
                      this.circleRadius);

        var probability;
        var xy = new Vec2(0, 0);
        ctx.lineWidth = 1;
//        ctx.translate(this.margin.x + this.circleRadius + this.menu_margin.x,
//                      this.margin.y + this.circleRadius + this.menu_margin.y);

        var firstCol = 0;
        var firstRow = 0;
/*
        var numCols = this.width / (this.columnWidth * this.scale);

        var numRows = this.height / (this.columnHeight * this.scale);

        var qubitsPerRow = -1;
        for (var i = 0; qubitsPerRow < 0; ++i) {
            if (numCols < ((1 << (i + 1)) * 0.75))
                qubitsPerRow = i;
        }
        numCols = 1 << qubitsPerRow;
*/
        var numRows = this.numRows;
        var numCols = this.numCols;

        var dataSource = this.qReg;
        if (this.qInt && this.qInt.valid)
            dataSource = this.qInt;

        var animT = 0;
        var animSin = 0;
        var animCos = 0;
        var animOffset = 0;
        var animating = false;
        var animSideOffset = 0;

        if (this.panel.animationRemainingTimeSec > 0) {
            animating = true;
            animT = this.panel.animationRemainingTimeSec / this.panel.animationTotalTimeSec;
            //            animT *= animT;
            animSin = Math.sin(animT * Math.PI);
            animCos = Math.cos(animT * Math.PI);
            animSideOffset = 0.15 * animSin;
            animOffset = 0.5 * (1 - animCos);
        }

        // Automatically scale up, nice for highly-distributed values
        if (this.autoMagScale)
        {
            this.magScale = 1.0;
            var maxMag = 0;
            for (var row = 0; row < numRows; ++row) {
                for (var col = 0; col < numCols; ++col) {
                    var val = row * numCols + col;
                    if (val < this.numValues) {
                        var xy = dataSource.peekComplexValue(val);
                        maxMag = Math.max(Math.abs(xy.x), Math.max(Math.abs(xy.y), maxMag));
                    }
                }
            }
            if (maxMag > 0)
                this.magScale = 1.0 / maxMag;
        }

        var num_vals_to_draw = this.numValues;
        if (this.drawQInt)
            num_vals_to_draw = 1 << this.drawQInt.numBits;
        else if (this.densityMatrix)
            num_vals_to_draw *= num_vals_to_draw;
        else if (this.fockState)
            num_vals_to_draw = this.qReg.photonSim.non_zero_states.length;
        else if (this.stabilizerState)
            num_vals_to_draw = this.qReg.numQubits * this.qReg.numQubits * 2;
        else if (this.blochSphere)
            num_vals_to_draw = this.qReg.numQubits;
        else if (this.graphState)
            num_vals_to_draw = 1;

        var dm_row;
        var dm_col;

        if (this.stabilizerState)
        {
            ctx.save();
            ctx.font = '48px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            var x_table = this.qReg.chp.qstate.x;
            var z_table = this.qReg.chp.qstate.z;
            var letters = ['I', 'X', 'Z', 'Y'];
            var colors  = [null, '#9e9', '#9ee', '#ee9'];
            var num_qubits = this.qReg.numQubits;
            var cw = 0.4 * this.columnWidth;

            ctx.fillStyle = '#eee';
            ctx.fillRect(-0.5 * cw, 0, 0.5 * numCols * cw, numRows * cw);
            ctx.fillRect((0.5 * numCols + 0.5) * cw, 0, 0.5 * numCols * cw, numRows * cw);

            var x = 0;
            var y = 0;
            for (var row = 0; row < numRows; ++row)
            {
                for (var col = 0; col < numCols; ++col)
                {
                    x = col * cw;
                    y = row * cw;

                    var tr = row;
                    var tc = col;
                    if (tc >= num_qubits)
                    {
                        x += cw;
                        tr += num_qubits;
                        tc -= num_qubits;
                    }

                    if (x * this.scale > this.width)
                        break;

                    var bits = 0;
                    if (x_table[tr][tc >> 5] & (1 << (tc & 31)))
                        bits |= 1;
                    if (z_table[tr][tc >> 5] & (1 << (tc & 31)))
                        bits |= 2;

                    if (colors[bits])
                    {
                        ctx.fillStyle = colors[bits];
                        ctx.fillRect(x - 0.5 * cw, y, cw, cw);
                    }

                    if (this.scale > 0.1)
                    {
                        ctx.fillStyle = 'black';
                        ctx.fillText(letters[bits], x, y);
                    }
                }
                if (y * this.scale > this.height)
                    break;
            }
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#C38EFF';
            ctx.globalAlpha = 1.0;
            ctx.beginPath();
            ctx.moveTo(cw * num_qubits, cw * 0.5);
            ctx.lineTo(cw * num_qubits, cw * (num_qubits + 0.5));
            ctx.stroke();
            ctx.globalAlpha = 1.0;

            ctx.restore();
        }
        if (this.blochSphere && !this.qReg.disableSimulation)
        {
            ctx.save();
            var textsize = 24;
            ctx.font = '' + textsize + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            var num_qubits = this.qReg.numQubits;
            var axis_labels = ['+','-','L','R','0','1'];
            var axis_positions = [[1,0,0],[-1,0,0],[0,0,1],[0,0,-1],[0,-1,0],[0,1,0]];
            var v = new Vec2(0, -radius);
            var vx = new Vec2(0, -radius);
            var vy = new Vec2(0, -radius);
            var vz = new Vec2(0, -radius);
            var theta = Math.PI * this.bloch_view_azimuth / 180.0;
            var phi = Math.PI * 30.0 / 180.0;
            var sphi = Math.sin(phi);
            var cphi = Math.cos(phi);
            var sth = Math.sin(theta);
            var cth = Math.cos(theta);
            // Cheeseball rotation martices
            var rot_matrix1 = [[cth,0,sth],[0,1,0],[-sth,0,cth]];   // Axis: Vertical
            var rot_matrix2 = [[cth,sth,0],[-sth,cth,0],[0,0,1]];   // Axis: Out of plane
            var rot_matrix3 = [[1,0,0],[0,cth,sth],[0,-sth,cth]];   // Axis: Horizontal
            var rot_matrix13 = [[cth,sth*-sphi,sth*cphi],[0,cphi,sphi],[-sth,cth*sphi,cth*cphi]];   // Axis: Horizontal
            var rot_matrix31 = [[cth,0,sth],[sth*-sphi,cphi,cth*sphi],[-sth*cphi,-sphi,cth*cphi]];   // Axis: Horizontal
            // 13
            //  c  0  s    1  0   0      _      c  s*-ss s*cc
            //  0  1  0    0  cc  ss     _      0  cc    ss
            // -s  0  c    0 -ss  cc           -s  c*-ss c*cc

            //  1  0   0    c  0  s      _      c  s*-ss s*cc
            //  0  cc  ss   0  1  0      _      0  cc    ss
            //  0 -ss  cc  -s  0  c            -s  c*-ss c*cc

            // 01 02 03   11 22 33 _ 01*11+04*22+07*33
            // 04 05 06   44 55 66 _ 01*11+04*22+07*33
            // 07 08 09   77 88 99   
            var rot_matrix = rot_matrix31;

            for (bit = 0; bit < num_qubits; ++bit)
            {
                var row = Math.floor(bit / numCols);
                var col = bit % numCols;
                var cx = col * this.columnWidth;
                var cy = row * this.columnWidth;
                if (row >= numRows)
                    continue;
                ctx.save();

                ctx.translate(cx, cy);
                var radius = this.circleRadius;
                ctx.lineWidth = 1;
                ctx.strokeStyle = '#C38EFF';
                ctx.globalAlpha = 0.75;
                strokeCircle(ctx, 0, 0, radius);

                if (this.qReg.ballistic_lattice)
                {
                    var qubits = this.qReg.ballistic_lattice.logical_qubits;
                    for (var i = 0; i < qubits.length; ++i)
                    {
                        var q = qubits[i];
                        if (q.path.length > 0)
                        {
                            var index = q.path[0] + this.qReg.ballistic_lattice.ballistic_lattice_qint.startBit;
                            if (index == bit)
                            {
                                ctx.globalAlpha = 0.5;
                                ctx.lineWidth = 3;
                                ctx.strokeStyle = q.color;
                                strokeCircle(ctx, 0, 0, radius * 1.1);
                            }
                        }
                    }
                }
                ctx.globalAlpha = 1.0;
                ctx.lineWidth = 1;
                ctx.strokeStyle = '#C38EFF';

                blochProject(vx, [1,0,0], rot_matrix);
                blochProject(vy, [0,1,0], rot_matrix);
                blochProject(vz, [0,0,1], rot_matrix);
                ctx.save();
                ctx.transform(vx.x, vx.y, vz.x, vz.y, 0, 0);
                strokeCircle(ctx, 0, 0, radius);
                ctx.restore();
                ctx.save();
                ctx.transform(vy.x, vy.y, vz.x, vz.y, 0, 0);
                strokeCircle(ctx, 0, 0, radius);
                ctx.restore();
                ctx.save();
                ctx.transform(vx.x, vx.y, vy.x, vy.y, 0, 0);
                strokeCircle(ctx, 0, 0, radius);
                ctx.restore();

                // draw the axes
                ctx.lineWidth = 1;
                ctx.globalAlpha = 0.5;
                ctx.strokeStyle = '#61477f';
                ctx.fillStyle = '#61477f';

                // Draw axes
                ctx.beginPath();
                for (var axis = 0; axis < axis_labels.length; ++axis)
                {
                    blochProject(v, axis_positions[axis], rot_matrix);
                    ctx.moveTo(0, 0);
                    ctx.lineTo(radius * 1.1 * v.x, radius * 1.1 * v.y);
                }
                ctx.stroke();
                ctx.globalAlpha = 1.0;

                // Draw axis labels
                ctx.fillStyle = 'black';
                var lineWidth = 3;
                for (var axis = 0; axis < axis_labels.length; ++axis)
                {
                    blochProject(v, axis_positions[axis], rot_matrix);
                    drawKetText(ctx, axis_labels[axis], radius * v.x, radius * v.y - 0.5 * textsize, lineWidth, textsize);
                }
                ctx.globalAlpha = 1.0;

                // Draw the states!
                var num_values = 1 << num_qubits;
                var step = 1 << bit;
                var pt = [0,0,0];
                val = 0;
                while (val < num_values)
                {
                    for (var i = 0; i < step; ++i)
                    {
                        var c0 = this.qReg.peekComplexValue(val);
                        var c1 = this.qReg.peekComplexValue(val + step);
                        var mag0 = c0.x * c0.x + c0.y * c0.y;
                        var mag1 = c1.x * c1.x + c1.y * c1.y;


                        if (c0.x || c0.y || c1.x || c1.y)
                        {
                            // Convert these complex values into a Bloch position
                            pt[1] = (mag1 - mag0) / (mag0 + mag1);
                            var sliceRadius = Math.sqrt(1.0 - pt[1] * pt[1]);
                            pt[0] = c1.x * c0.x + c1.y * c0.y;
                            pt[2] = c1.x * c0.y - c1.y * c0.x;
                            var sliceMag = Math.sqrt(pt[0] * pt[0] + pt[2] * pt[2]);
                            if (sliceMag > 0)
                            {
                                var sliceScale = sliceRadius / sliceMag;
                                pt[0] *= sliceScale;
                                pt[2] *= sliceScale;
                            }

                            // Color based on the maximum magnitude, to make it
                            // likely we'll get Bell pairs to color match
                            var colorVal = (mag0 > mag1) ? val : val + step;
                            if (Math.abs(mag0 - mag1) < 0.01)
                                colorVal = mag0;
                            if (num_values > 1)
                                colorVal /= num_values - 1;
                            colorVal *= 10.7; // We don't want exact wraparounds
                            var color = rainbow_color(colorVal);
                            ctx.strokeStyle = color;
                            ctx.fillStyle = color;

                            blochProject(v, pt, rot_matrix);
                            ctx.globalAlpha = 0.25;
                            ctx.lineWidth = 5;
                            ctx.beginPath();
                            ctx.moveTo(0, 0);
                            ctx.lineTo(radius * v.x, radius * v.y);
                            ctx.stroke();
                            ctx.globalAlpha = 1.0;

                            var miniRadius = 10;
                            fillCircle(ctx, radius * v.x, radius * v.y, miniRadius);
                        }
                        val++;
                    }
                    val += step;
                }
                ctx.restore();
            }

            ctx.restore();
        }

        if (this.graphState && this.qReg.ballistic_lattice)
        {
            this.qReg.ballistic_lattice.draw(ctx, this);
        }
        else if (this.graphState && (num_qubits > 22 || this.qReg.disableSimulation))
        {
            console.log('Graph state not drawing (too many possible links)');
        }
        else if (this.graphState)
        {
            // Figure out the graph state connections
            // This should probably be done somewhere else.
            var num_qubits = this.qReg.numQubits;
            var num_values = 1 << num_qubits;
            var has_mag = bitfield_zero;
            var phase_flips = bitfield_zero;
            var v0 = null;
            for (var i = 0; i < num_values; ++i)
            {
                var vi = this.qReg.peekComplexValue(i);
                if (v0 == null)
                    v0 = vi;
                if (vi.x * vi.x + vi.y * vi.y > 0)
                    has_mag |= bitfield_one << to_bitfield(i);
                if (v0.x * vi.x + v0.y * vi.y < 0)
                    phase_flips |= bitfield_one << to_bitfield(i);
            }
            // Now phaseFlips contains the phase info we need.
            // By setting it to zero, we can get the operations we need.
            var links = [];
            var first_val = getLowestBitIndex(phase_flips);
            if (first_val >= 0)
            {
                var last_val = getHighestBitIndex(phase_flips);
                for (val = first_val; val < num_values; ++val)
                {
                    if (getBit(has_mag, val))
                    {
                        var bit_state = 0;
                        if (val <= last_val)
                            bit_state = getBit(phase_flips, val);
                        for (var i = 0; i < links.length; ++i)
                        {
                            var link = links[i];
                            if ((val & link) == link)
                                bit_state = !bit_state;
                        }
                        if (bit_state)
                        {
                            links.push(val);
//                            console.log(val);
                        }
                    }
                }
            }

//            if (links.length)
//                console.log('---------------');
//            for (var i = 0; i < links.length; ++i)
//                console.log('link ' + links[i]);

            ctx.save();
            var textsize = 24;
            ctx.font = '' + textsize + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            var num_qubits = this.qReg.numQubits;
            var major_radius = 0.35 * Math.min(this.columnWidth, this.columnHeight);
            var node_radius = 0.15 * major_radius * 2.0 * Math.PI / num_qubits;
            var node_pos = this.set_graph_node_positions();

            // Draw the links
            for (var link_index = 0; link_index < links.length; ++link_index)
            {
                var link = links[link_index];
                var cx = 0;
                var cy = 0;
                var bit_count = 0;
                for (var bit = 0; bit < num_qubits; ++bit)
                {
                    if (link & (1 << bit))
                    {
                        cx += node_pos[bit][0];
                        cy += node_pos[bit][1];
                        bit_count++;
                    }
                }
                cx /= bit_count;
                cy /= bit_count;

                ctx.lineWidth = 6;
                ctx.strokeStyle = '#08a';
                ctx.fillStyle = '#eef';
                if (bit_count == 1)
                {
                    for (var bit = 0; bit < num_qubits; ++bit)
                    {
                        if (link & (1 << bit))
                        {
                            var nx = node_pos[bit][0];
                            var ny = node_pos[bit][1];
                            strokeCircle(ctx, nx + node_radius, ny - node_radius, 0.75 * node_radius);
                        }
                    }
                }
                else if (bit_count == 2)
                {
                    ctx.beginPath();
                    var index = 0;
                    for (var bit = 0; bit < num_qubits; ++bit)
                    {
                        if (link & (1 << bit))
                        {
                            var nx = node_pos[bit][0];
                            var ny = node_pos[bit][1];
                            if (!index++)
                                ctx.moveTo(nx, ny);
                            else
                                ctx.lineTo(nx, ny);
                        }
                    }
                    ctx.stroke();
                }
                else
                {
                    var t = 0.4;
                    var tt = 1.0 - t;
                    // Draw the radial lines
                    ctx.beginPath();
                    for (var bit = 0; bit < num_qubits; ++bit)
                    {
                        if (link & (1 << bit))
                        {
                            var nx = node_pos[bit][0];
                            var ny = node_pos[bit][1];
                            var sx = t * nx + tt * cx;
                            var sy = t * ny + tt * cy;
                            ctx.moveTo(nx, ny);
                            ctx.lineTo(sx, sy);
                        }
                    }
                    ctx.stroke();

                    // Draw the patch in the middle
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = '#08a';
                    ctx.fillStyle = '#08a';
                    var index = 0;
                    var fx, fy;
                    ctx.beginPath();
                    for (var bit = 0; bit < num_qubits; ++bit)
                    {
                        if (link & (1 << bit))
                        {
                            var nx = node_pos[bit][0];
                            var ny = node_pos[bit][1];
                            var sx = t * nx + tt * cx;
                            var sy = t * ny + tt * cy;
                            if (!index++)
                            {
                                ctx.moveTo(sx, sy);
                                fx = sx;
                                fy = sy;
                            }
                            else
                                ctx.lineTo(sx, sy);
                        }
                    }
                    ctx.lineTo(fx, fy);
                    ctx.globalAlpha = 0.3;
                    ctx.fill();
                    ctx.globalAlpha = 1.0;
                    ctx.stroke();
                }
            }

            // Draw the circles
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#000';
            ctx.fillStyle = '#eef';
            var textsize = node_radius * 0.75;
            ctx.font = 'bold ' + textsize + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            for (bit = 0; bit < num_qubits; ++bit)
            {
                var cx = node_pos[bit][0];
                var cy = node_pos[bit][1];
                ctx.fillStyle = '#eef';
                fillCircle(ctx, cx, cy, node_radius);
                strokeCircle(ctx, cx, cy, node_radius);
                ctx.fillStyle = '#000';
//                var label = this.qReg.getQubitIntName(bit);
                var label = '0x' + this.qReg.getQubitIntPlace(bit);
                ctx.fillText(label, cx, cy);
            }

            ctx.restore();
        }

        for (var row = 0; row < numRows && 
                                !this.stabilizerState && 
                                !this.blochSphere &&
                                !this.graphState; ++row) {
            ctx.save();
            for (var col = 0; col < numCols; ++col) {
                var val = row * numCols + col;

                if (this.densityMatrix)
                {
                    val = row * this.numValues + col;
                    dm_row = Math.floor(val / this.numValues);
                    dm_col = val % this.numValues;
                }

                if (val >= num_vals_to_draw) {
                    // Done.
                    row = numRows;
                    col = numCols;
                }
                else {
                    // Draw the phase discs

                    var cval = null;
                    var cval_array = null;
                    if (this.drawQInt)
                    {
                        cval_array = [];
                        var probability = this.drawQInt.peekProbability(val, cval_array);
                        // If there's only one phase, then we can display it easily.
                        if (cval_array.length == 1)
                        {
                            cval = cval_array[0];
                            cval_array = null;
                        }
                        else
                        {
                            cval = new Vec2(0, Math.sqrt(probability));
                        }
                    }
                    else if (this.fockState)
                    {
                        cval = this.qReg.photonSim.getNonZeroStateComplexMag(val);
                    }
                    else if (this.densityMatrix)
                    {
                        if (dataSource.current_mix)
                        {
                            cval = new Vec2(0, 0);
                            var total_mag = 0;
                            for (var m = 0; m < dataSource.current_mix.length; ++m)
                            {
                                var cm = dataSource.current_mix[m];                                
                                var mix_prob = cm[0];
                                var mix_reg = dataSource.mixed_states[cm[1]].reg;
                                var cval_col = mix_reg.peekComplexValue(dm_col);
                                var cval_row = mix_reg.peekComplexValue(dm_row);
                                cval_row.y = -cval_row.y; // complex conjugate
                                cval.x += mix_prob * (cval_col.x * cval_row.x - cval_col.y * cval_row.y);
                                cval.y += mix_prob * (cval_col.x * cval_row.y + cval_col.y * cval_row.x);
                            }
                        }
                        else
                        {
                            var cval_col = dataSource.peekComplexValue(dm_col);
                            var cval_row = dataSource.peekComplexValue(dm_row);
                            cval_row.y = -cval_row.y; // complex conjugate
                            cval = new Vec2(cval_col.x * cval_row.x - cval_col.y * cval_row.y,
                                            cval_col.x * cval_row.y + cval_col.y * cval_row.x);
                        }
                    }
                    else
                    {
                        // Full state vector
                        if (dataSource.current_mix)
                        {
                            cval_array = [];
                            cval = new Vec2(0, 0);
                            var total_mag = 0;
                            for (var m = 0; m < dataSource.current_mix.length; ++m)
                            {
                                var cm = dataSource.current_mix[m];                                
                                var mix_prob = cm[0];
                                var sqrt_mix_prob = Math.sqrt(mix_prob);
                                var mix_reg = dataSource.mixed_states[cm[1]].reg;
                                var this_val = mix_reg.peekComplexValue(val);
                                this_val.x *= sqrt_mix_prob;
                                this_val.y *= sqrt_mix_prob;
                                var this_prob = this_val.x * this_val.x + this_val.y * this_val.y;
                                if (this_prob)
                                {
                                    cval_array.push(this_val);
                                    total_mag += this_prob;
                                }
                            }

                            if (cval_array.length == 1)
                            {
                                cval = cval_array[0];
                                cval_array = null;
                            }
                            else
                            {
                                cval = new Vec2(0, Math.sqrt(total_mag));
                            }
                        }
                        else
                        {
                            cval = dataSource.peekComplexValue(val);
                        }
                    }

                    if (this.wasAnimating && !animating)
                        this.prevXYValues[val] = cval;

                    ctx.save();
                    {
                        if (animating)
                        {
                            if (this.panel.animationInstruction && 
                                (this.panel.animationInstruction.op == "not" || this.panel.animationInstruction.op == "cnot"))
                            {
                                // TODO: full bitfield support here
                                var cond32 = this.panel.animationInstruction.conditionQubits.getBits(0);
                                var targ32 = this.panel.animationInstruction.targetQubits.getBits(0);
                                if (isAllZero(this.panel.animationInstruction.conditionQubits)
                                    || (val & cond32) == cond32)
                                {

                                    var destX = 0;
                                    var destY = 0;
                                    for (var tq = 0; tq < this.qReg.numQubits; ++tq) {
                                        var targetQubit = 1 << tq;
                                        if (targetQubit & targ32) {
                                            var direction = 1;
                                            if (val & targetQubit)
                                                direction = -1;

                                            if (targetQubit >= numCols)
                                                destY += direction * this.columnHeight * (targetQubit / numCols);
                                            else
                                                destX += direction * this.columnWidth * targetQubit;
                                        }
                                    }
                                    // now destX and deatY are the relative destinations for this
                                    var tx = animOffset * destX + animSideOffset * destY;
                                    var ty = animOffset * destY + animSideOffset * destX;
                                    ctx.translate(tx, ty);
                                }
                            }
                            else {
//                                console.log("smooth anim");
                                // Animate rotations, hadamards, etc
                                var prevXY = this.prevXYValues[val];
                                if (prevXY != null && cval) {
//                                    console.log("prevXY = " + prevXY.x + "," + prevXY.y);
//                                    console.log("xy = " + xy.x + "," + xy.y);
                                    cval.x = (animOffset * prevXY.x) + ((1.0 - animOffset) * cval.x);
                                    cval.y = (animOffset * prevXY.y) + ((1.0 - animOffset) * cval.y);
//                                    console.log("interp xy = " + cval.x + "," + cval.y);
                                }
                            }
                        }
                        this.drawValueCircle(ctx, 0, 0, cval, cval_array);
                    }
                    ctx.restore();
                    if (this.wheelScale > 0.4)
                    {
                        if (this.fockState)
                            this.drawValueCircleText(ctx, 0, 0, cval, cval_array, this.qReg.photonSim.getNonZeroStateLabel(val));
                        else
                            this.drawValueCircleText(ctx, 0, 0, cval, cval_array, val);
                    }

                    ctx.translate(this.columnWidth, 0);
                }
            }
            ctx.restore();
            ctx.translate(0, this.columnHeight);
        }
        this.wasAnimating = animating;
        ctx.restore();
    }

    
    this.drawPP = function(ctx)
    {
        if (!this.visible)
            return;
        ctx.fillStyle = "#e0e0e0";
        ctx.fillRect(0, 0, this.size.x, this.size.y);
        var cx = this.margin.x * this.wheelScale;
        var cy = this.margin.y * this.wheelScale + this.rowHeight;
        var probabllity;
        var xy = new Vec2(0, 0);
        ctx.lineWidth = 1;
        for (var col = 0; col < this.numValues; ++col)
        {
            // Draw the prob bar
            probability = dataSource.getValueProbability(col);
//            console.log('prob |' + col + '> = ' + probability);
            ctx.fillStyle = catDarkColor;
            ctx.fillRect(cx+1, cy+1 - this.rowHeight * probability, this.columnWidth, this.rowHeight * probability);
            ctx.fillStyle = catLightColor;
            ctx.fillRect(cx, cy - this.rowHeight * probability, this.columnWidth, this.rowHeight * probability);
          
            ctx.save();
            {

                // Draw the phase discs
                xy.x = dataSource.getValueX(col);
                xy.y = dataSource.getValueY(col);
                xy.normalize();
                var radius = this.columnWidth * 0.6;
                var rx = cx + this.columnWidth * 0.5;
                var ry = cy + this.margin.y * this.wheelScale + radius;
                strokeCircle(ctx, rx, ry, radius);

                ctx.beginPath();
                ctx.lineTo(rx, ry);
                ctx.lineTo(rx + xy.x * radius, ry + xy.y * radius);
            ctx.stroke();
    //            ctx.strokeStyle = "#000000";
            }
            ctx.restore();

            cx += this.columnWidth;
        }
    }

    this.draw = function()
    {
        if (this.qInt && this.qInt.valid)
            this.numValues = 1 << this.qInt.numBits;
        else
            this.numValues = 1 << this.qReg.numQubits;

        this.calculateDimensions();
        if (!this.visible || !this.panel.canvas)
            return;

//        this.width = this.panel.canvas.width;
//        this.height = this.panel.canvas.height;
//        this.columnWidth = this.width / this.numValues;
//        if (this.columnWidth < 30)
//            this.columnWidth = 30;
//        if (this.columnWidth > this.circleRadius * 2.5)
//            this.columnWidth = this.circleRadius * 2.5;
//        this.columnWidth = this.circleRadius * 2.5;
//        this.columnHeight = this.circleRadius * 2.5;


        var ctx = this.panel.canvas.getContext('2d');
        this.drawXYCircles(ctx);
    }

	this.changed = function ()
	{
        this.draw();
	}

    
	this.message = function (msg, bitMask, arg1)
	{
	}

    this.mouseWheel = function (e)
    {
        if (e.ctrlKey == true)
        {
            var dy = e.deltaY;
//            console.log('Wheel ' + dy);
            if (dy > 0)
                this.wheelScale *= 0.9;
            if (dy < 0)
                this.wheelScale *= 1.1;

            if (this.wheelScale < 0.1)
                this.wheelScale = 0.1;
            if (this.wheelScale > 6.0)
                this.wheelScale = 6.0;
            this.panel.draw();
            return false;
        }
        else if (e.shiftKey == true)
        {
            var dx = e.deltaX;
            var dy = e.deltaY;
            // On some platforms, the shift key makes the mouse wheel swap X and Y.
            if (Math.abs(dx) > Math.abs(dy))
                dy = dx;
//            console.log('Wheel ' + dy);
            if (dy > 0)
                this.magScale *= 0.9;
            if (dy < 0)
                this.magScale *= 1.1;

            if (this.magScale < 1.0)
                this.magScale = 1.0;
            if (this.magScale > 10.0)
                this.magScale = 10.0;
//            console.log('mag: ' + this.magScale);
            this.panel.draw();
//            console.log('mag: ' + this.magScale);
            return false;
        }
        else
        {
            var dy = e.deltaY;
            this.bloch_view_azimuth += dy * 0.05;
            this.panel.draw();
        }
        return false;
    }

    this.mouseDown = function (x, y)
    {
        var radius = 15;
        var dx = x - this.collapse_x;
        var dy = y - this.collapse_y;
        if (dx * dx + dy * dy < radius * radius)
        {
            this.collapsed = !this.collapsed;
            this.panel.draw();
            return true;
        }
        return false;
    }

    this.mouseUp = function (x, y)
    {
        return false;
    }

    this.mouseMove = function (x, y)
    {
        // If it's in the grow box, pass it up.
        var grow_size = 20;
        if (x > this.panel.width - grow_size &&
            y > this.panel.height - grow_size)
            return false;

        var circle_index = -1;
        y -= this.barHeight;
        if (this.fockState && x >= 0 && y >= 0 && !this.collapsed
            && this.visible && this.in_use && this.qReg.use_photon_sim)
        {
            var circle_x = 0|(x / (this.columnWidth  * this.scale));
            var circle_y = 0|(y / (this.columnHeight * this.scale));
            circle_index = circle_x + circle_y * this.numCols;
        }

        if (circle_index != this.hovered_fock_circle)
        {
            if (this.qReg.staff)
                this.qReg.staff.hoverFockPattern = null;
            this.hovered_fock_circle = circle_index;
            if (circle_index >= 0)
            {
                if (this.qReg.staff)
                {
                    this.qReg.staff.hoverFockPattern = 
                        this.qReg.photonSim.getNonZeroState(circle_index);
                    this.qReg.staff.draw(false);
                }
            }
        }
    }

}


// Node.js hookups
module.exports.Vec2 = Vec2;
module.exports.QChart = QChart;
module.exports.strokeCircle = strokeCircle;
module.exports.fillCircle = fillCircle;

