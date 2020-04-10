/////////////////////////////////////////////////////////////////////////////
// qcengine_canvas.js
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






/////////////////////////////////////////////////////////////////////////////
// The Widget classes
//
//

var allPanels = new Array();
var draggedPanel = null;
var draggedFrameCount = 0;
var dragMode = 'move';  // 'move' or 'resize'
// var panel_stopwatch = null;
// var panel_chart = null;
// var panel_staff = null;
// var panel_chip = null;
// var panel_script = null;
// var panel_setup = null;
// var panel_script = null;

function Panel(canvas, div)
{
    this.widgets = new Array();
    this.mouseX = 0;
    this.mouseY = 0;
    this.growBoxSize = 16;

    this.dragMouseStartX = 0;
    this.dragMouseStartY = 0;
    this.dragCanvasStartX = 0;
    this.dragCanvasStartY = 0;

    this.draw = function()
    {
        if (this.canvas)
        {
            var canvas = this.canvas;
            var ctx = canvas.getContext('2d');
            ctx.save();
            {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            ctx.restore();

            for (var i = 0; i < this.widgets.length; ++i)
            {
                this.widgets[i].draw();
            }
            if (this.growBoxSize > 0)
                this.drawGrowBox(ctx);
        }
    }

    this.set_canvas = function(canvas)
    {
        this.canvas = canvas;
        if (this.canvas)
            this.canvas.panel = this;
    }
    this.set_div = function(div)
    {
        this.div = div;
        if (this.div)
        {
            this.div.panel = this;

            this.div.ondblclick = function(e)
            {
                e.Handled = true;
            }

            this.div.onmousedown = function(e)
            {
                this.panel.getMousePos(e);

                for (var i = this.panel.widgets.length - 1; i >= 0 && !e.Handled; --i)
                {
                    e.Handled = this.panel.widgets[i].mouseDown(
                        this.panel.mouseX - this.panel.widgets[i].pos.x,
                        this.panel.mouseY - this.panel.widgets[i].pos.y, e);
                }
                if (!e.Handled)
                {
                    // Start canvas drag
                    this.panel.dragMouseStartX = e.pageX;
                    this.panel.dragMouseStartY = e.pageY;
                    this.panel.dragCanvasStartX = parseInt(this.panel.div.style.left);
                    this.panel.dragCanvasStartY = parseInt(this.panel.div.style.top);
                    this.panel.dragCanvasStartW = parseInt(this.panel.div.style.width);
                    this.panel.dragCanvasStartH = parseInt(this.panel.div.style.height);
                    draggedPanel = this.panel;
                    draggedFrameCount = 0;
                    if (this.panel.inGrowBox(this.panel.mouseX, this.panel.mouseY))
                        dragMode = 'resize';
                    else if (this.panel.inCloseBox(this.panel.mouseX, this.panel.mouseY))
                        dragMode = 'close';
                    else
                        dragMode = 'move';
                }
                return false;   // Keep us from selecting text while dragging!!
            }

            this.div.onwheel = function(e)
            {
                var handled = false;
                for (var i = this.panel.widgets.length - 1; i >= 0 && !e.Handled; --i)
                {
                    if (this.panel.widgets[i].mouseWheel)
                        handled = this.panel.widgets[i].mouseWheel(e);
                }
                return !handled;
            }

            this.div.onmouseup = function(e)
            {
                this.panel.getMousePos(e);
                for (var i = this.panel.widgets.length - 1; i >= 0 && !e.Handled; --i)
                {
                    e.Handled = this.panel.widgets[i].mouseUp(
                        this.panel.mouseX - this.panel.widgets[i].pos.x,
                        this.panel.mouseY - this.panel.widgets[i].pos.y);
                }
            }

            this.div.onmousemove = function(e)
            {
                this.panel.getMousePos(e);
                for (var i = this.panel.widgets.length - 1; i >= 0 && !e.Handled; --i)
                {
                    e.Handled = this.panel.widgets[i].mouseMove(
                        this.panel.mouseX - this.panel.widgets[i].pos.x,
                        this.panel.mouseY - this.panel.widgets[i].pos.y);
                }
                return false;   // Keep us from selecting text while dragging!!
            }

            this.div.ontouchstart = function(e)
            {
                console.log('div ontouchstart!');
                if (this.div && this.div.onmousedown)
                    return this.div.onmousedown(e);
                return true;
            }

            this.div.ontouchend = function(e)
            {
                console.log('div ontouchend!');
                if (this.div && this.div.onmouseup)
                    return this.div.onmouseup(e);
                return true;
            }

            this.div.ontouchmove = function(e)
            {
                console.log('div ontouchmove!');
                if (this.div && this.div.onmousemove)
                    return this.div.onmousemove(e);
                return true;
            }
        }
    }
/*
    this.startAnimation = function(instruction)
    {
        for (var i = 0; i < this.widgets.length; ++i)
        {
            this.widgets[i].startAnimation(instruction);
        }
    }
*/
    this.set_inverse_video = function(inverse)
    {
        this.inverse_video = inverse;
        if (this.div)
        {
            if (this.inverse_video)
                this.div.style.filter = 'invert(100%)';
            else
                this.div.style.filter = 'none';
        }
    }
    this.startAnimation = function(instruction)
    {
        var alreadyAnimating = false;

        if (this.animationRemainingTimeSec > 0)
            alreadyAnimating = true;

        this.animationRemainingTimeSec = this.animationTotalTimeSec;
        if (alreadyAnimating)
        {
            this.animationInstruction = null;
        }
        else
        {
            this.animationInstruction = instruction;
            this.updateAnimation();
        }
    }

    this.updateAnimation = function()
    {
        this.animationRemainingTimeSec -= this.animationIntervalMS / 1000.0;
        if (this.animationRemainingTimeSec <= 0)
        {
            this.animationRemainingTimeSec = 0;
//            this.panel.draw();  // finish with full draw
        }
        
        this.draw();

        var self = this;
        if (this.animationRemainingTimeSec > 0)
            setTimeout(function(){self.updateAnimation()}, this.animationIntervalMS);
    }


    this.setSize = function(width, height)
    {
        this.width = width;
        this.height = height;
        if (this.canvas)
        {
            this.canvas.width = width;
            this.canvas.height = height;
        }
        if (this.div)
        {
            this.div.style.width = width + 'px';
            this.div.style.height = height + 'px';
        }
        this.draw();
    }

    this.setPos = function(left, top)
    {
        if (this.div)
        {
            this.div.style.left = left + 'px';
            this.div.style.top = top + 'px';
            if (this.attach_div)
            {
                this.attach_div.style.left = (left + this.attach_div_offset.x) + 'px';
                this.attach_div.style.top = (top + this.attach_div_offset.y) + 'px';
            }
        }
    }

    this.setVisible = function(visible)
    {
        var vis = "none";
        if (visible)
        {
            if (!this.isVisible())
                this.bringToFront();
            vis = "block";
        }
        if (this.div)
            this.div.style.display = vis;
        if (this.attach_div)
            this.attach_div.style.display = vis;
    }
    this.isVisible = function()
    {
        if (this.div)
            return this.div.style.display != "none";
        return false;
    }
    this.toggleVisible = function()
    {
        this.setVisible(!this.isVisible());
    }
    this.bringToFront = function()
    {
        if (this.div)
        {
            var parent = this.div.parentNode;
            if (parent)
            {
                parent.removeChild(this.div);
                parent.appendChild(this.div);
            }
        }
    }

    this.getMousePos = function(e)
    {
        if (e.offsetX)
        {
            this.mouseX = e.offsetX;
            this.mouseY = e.offsetY;
        }
        else if (e.layerX)
        {
            this.mouseX = e.layerX;
            this.mouseY = e.layerY;
        }
    }

    

    this.drawCloseBox = function(ctx)
    {
    }

    this.drawGrowBox = function(ctx)
    {
        var enable_grow_box = false; // Disable grow boxes
        if (enable_grow_box)
        {
            ctx.strokeStyle = 'black';
            ctx.fillStyle = 'white';
            ctx.globalAlpha = 0.5;
            var x = this.width - this.growBoxSize;
            var y = this.height - this.growBoxSize;
            var w = this.growBoxSize * 1.5;
            var h = this.growBoxSize * 1.5;
            var radius = 4;
            rounded_rect(ctx, x, y, w, h, radius, true, true)
            ctx.globalAlpha = 1.0;
        }
    }

    this.inCloseBox = function(x, y)
    {
        return (x >= this.width - this.growBoxSize) && y <= this.growBoxSize;
    }

    this.inGrowBox = function(x, y)
    {
        return x >= this.width - this.growBoxSize
                && y >= this.height - this.growBoxSize;
    }

    this.set_canvas(canvas);
    this.set_div(div);
    this.setVisible(false);
}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////

//document.onmousedown = function(e)
//{
//}

if (typeof document !== 'undefined')
{
    document.onmouseup = function(e)
    {
        if (draggedPanel && dragMode == 'close')
        {
            draggedPanel.getMousePos(e);
            if (draggedPanel.inCloseBox(draggedPanel.mouseX, draggedPanel.mouseY))
            {
                draggedPanel.setVisible(false);
            }
        }
        draggedPanel = null;
        return true;
    }

    document.onmousemove = function(e)
    {
        var mx = e.pageX;
        var my = e.pageY;
        if (draggedPanel)
        {
            if (draggedFrameCount == 0)
            {
                draggedPanel.bringToFront();
            }
            draggedFrameCount++;
            if (dragMode == 'move')
            {
                var x = draggedPanel.dragCanvasStartX + mx - draggedPanel.dragMouseStartX;
                var y = draggedPanel.dragCanvasStartY + my - draggedPanel.dragMouseStartY;
                if (x < 0) x = 0;
                if (y < 0) y = 0;
                draggedPanel.setPos(x, y);
            }
            else if (dragMode == 'resize')
            {
                var x = draggedPanel.dragCanvasStartW + mx - draggedPanel.dragMouseStartX;
                var y = draggedPanel.dragCanvasStartH + my - draggedPanel.dragMouseStartY;
                if (x < 64) x = 64;
                if (y < 64) y = 64;
                draggedPanel.setSize(x, y);
            }
        }
    }

    //document.ontouchstart = document.onmousedown;
    //document.ontouchend = document.onmouseup;
    //document.ontouchmove = document.onmousemove;

    document.ontouchstart = function(e)
    {
        console.log('doc ontouchstart!');
        if (document.onmousedown)
            document.onmousedown(e);
    }

    document.ontouchend = function(e)
    {
        console.log('doc ontouchend!');
        if (document.onmouseup)
            document.onmouseup(e);
    }

    document.ontouchmove = function(e)
    {
        console.log('doc ontouchmove!');
        if (document.onmousemove)
            document.onmousemove(e);
    }
}

function radialPos(center, thetaDegrees, radius)
{
    var thetaRadians = thetaDegrees * Math.PI / 180.0;
    var sval = Math.sin(thetaRadians);
    var cval = Math.cos(thetaRadians);
    return new Vec2(center.x + radius * sval, center.y + radius * -cval);
}

function createDiv(x, y)
{
    var divTag = document.createElement("div");
    if (!divTag)
        return null;
    divTag.id = "stopwatchDiv";
//    divTag.setAttribute("align","center");
    divTag.style.margin = "0px auto";
    divTag.style.position = 'absolute';
    divTag.style.left = '' + x + 'px';
    divTag.style.top = '' + y + 'px';
//    divTag.style.width = 500;
//    divTag.style.height = 50;
    divTag.style.border = '1px solid #999';
    divTag.style.zIndex = 2;
//    divTag.className ="dynamicDiv";

    divTag.style.shadow = "0 0 30px 5px #999";
    divTag.style.cssText += "-moz-box-shadow: 0 0 30px 5px #999; -webkit-box-shadow: 0 0 30px 5px #999;";

    // These are important! They keep canvas-clicks from selecting text.
    divTag.onselectstart = function() { return false; };
    divTag.onmousedown = function()   { return false; };            

//    divTag.innerHTML = "This HTML Div tag created using Javascript DOM dynamically.";
    document.body.appendChild(divTag);

    return divTag;
}

function createStopwatchPanel(myReg, x=0, y=0, canvas=null, div=null, create_canvas=false, create_div=false)
{
    if (create_div)
        div = createDiv(x, y);
    if (create_canvas)
        canvas = document.createElement("canvas");
    if (div && canvas)
        div.appendChild(canvas);

    var panel = new Panel(canvas, div);
    panel.setSize(602/2+50, 854/2+20);

    var stopwatchQubit = 0x01;
    var watch = new QStopwatch(myReg, stopwatchQubit, panel, new Vec2(0, 0));

    var center = watch.dialCenterPos();
    center.x -= 16;
    center.y -= 16;
    var thetaDegrees = -2;
    var dtheta = 19;
    var buttonRadius = 160;
    var buttonPos = radialPos(center, thetaDegrees, buttonRadius);
    new QNotCharm(myReg, panel, buttonPos, stopwatchQubit, "not");
    buttonPos = radialPos(center, thetaDegrees + dtheta*1, buttonRadius);
    new QCoinTossCharm(myReg, panel, buttonPos, stopwatchQubit, "random");
    buttonPos = radialPos(center, thetaDegrees + dtheta*2, buttonRadius);
    new QHadamardCharm(myReg, panel, buttonPos, stopwatchQubit, "hadamard");
    buttonPos = radialPos(center, thetaDegrees + dtheta*3, buttonRadius);
    new QRotateCharm(myReg, panel, buttonPos, stopwatchQubit, "rotate");
    buttonPos = radialPos(center, thetaDegrees + dtheta*4, buttonRadius);
    new QPhaseShiftCharm(myReg, panel, buttonPos, stopwatchQubit, "phase shift");
    buttonPos = radialPos(center, thetaDegrees + dtheta*5, buttonRadius);
    new QCat(myReg, panel, buttonPos);

    return panel;
}

function createStaffPanel(myReg, x=0, y=0, canvas=null, div=null, create_canvas=false, create_div=false)
{
    if (create_div)
        div = createDiv(x, y);
    if (create_canvas)
        canvas = document.createElement("canvas");
    if (div && canvas)
        div.appendChild(canvas);

    var panel = new Panel(canvas, div);
    panel.setSize(500, 150);

    new QStaff(myReg, panel, new Vec2(0, 0));

    return panel;
}

function createChartPanel(myReg, x=0, y=0, canvas=null, div=null, create_canvas=false, create_div=false)
{
    var int_menu_select = null;
    var int_menu_div = null;

    if (create_div)
    {
        div = createDiv(x, y);
        int_menu_select = document.createElement("select");
        int_menu_div = document.createElement("div");
    }
    if (create_canvas)
        canvas = document.createElement("canvas");
    if (div && canvas)
        div.appendChild(canvas);

    if (div)
    {
        div.appendChild(canvas);
        int_menu_div.appendChild(int_menu_select);
        int_menu_div.style.width = '20' + 'px';
        int_menu_div.style.height = '40' + 'px';
        int_menu_div.style.position = 'relative';
        int_menu_div.style.zIndex = 1;
        int_menu_div.style.left = 30;
        int_menu_div.style.top = 30;
        int_menu_div.style.display = "none";
        document.body.appendChild(int_menu_div);
    }

    var panel = new Panel(canvas, div);
    panel.setSize(500, 200);

    panel.int_menu_select = int_menu_select;
    new QChart(myReg, panel, new Vec2(0, 0));

    return panel;
}

function activateStopwatch()
{
    panel_stopwatch = createStopwatchPanel(panel_staff.staff.qReg, 130, 360);
    allPanels.push(panel_stopwatch);
}

function createAllPanels(panelList)
{
    var numQubits = 1;
    var blockQubits = 1;
    var myReg = new QReg(numQubits, blockQubits, false);
    var myInt = new QInt(numQubits, 'a', myReg);
    myReg.activate();
    myReg.writeAll(1);

    panel_staff = createStaffPanel(myReg, 600, 470);
    panelList.push(panel_staff);

    panel_chart = createChartPanel(myReg, 580, 270);
    panelList.push(panel_chart);

    if (panel_chart && panel_chart.qReg)
        panel_chart.qReg.changed(); // force a draw
}



/////////////////////////////////////////////////////////////////



function DrawAllPanels()
{
    for (var i = 0; i < allPanels.length; ++i)
    {
        allPanels[i].draw();
    }
}

function rounded_rect(ctx, x, y, width, height, radius, do_stroke, do_fill)
{
    ctx.beginPath();
    ctx.moveTo(x,y+radius);
    ctx.lineTo(x,y+height-radius);
    ctx.quadraticCurveTo(x,y+height,x+radius,y+height);
    ctx.lineTo(x+width-radius,y+height);
    ctx.quadraticCurveTo(x+width,y+height,x+width,y+height-radius);
    ctx.lineTo(x+width,y+radius);
    ctx.quadraticCurveTo(x+width,y,x+width-radius,y);
    ctx.lineTo(x+radius,y);
    ctx.quadraticCurveTo(x,y,x,y+radius);
    if (do_stroke)
        ctx.stroke();
    if (do_fill)
        ctx.fill();
}

function rounded_rect_nosides(ctx, x, y, width, height, radius, do_stroke, do_fill)
{
    ctx.beginPath();
    ctx.moveTo(x,y+radius);
    ctx.moveTo(x,y+height-radius);
    ctx.quadraticCurveTo(x,y+height,x+radius,y+height);
    ctx.lineTo(x+width-radius,y+height);
    ctx.quadraticCurveTo(x+width,y+height,x+width,y+height-radius);
    ctx.moveTo(x+width,y+radius);
    ctx.quadraticCurveTo(x+width,y,x+width-radius,y);
    ctx.lineTo(x+radius,y);
    ctx.quadraticCurveTo(x,y,x,y+radius);
    if (do_stroke)
        ctx.stroke();
    if (do_fill)
        ctx.fill();
}

function rounded_rect_leftonly(ctx, x, y, width, height, radius, do_stroke, do_fill)
{
    ctx.beginPath();
    ctx.moveTo(x+radius,y);
    ctx.quadraticCurveTo(x,y,x,y+radius);
    ctx.lineTo(x,y+radius);
    ctx.lineTo(x,y+height-radius);
    ctx.quadraticCurveTo(x,y+height,x+radius,y+height);
    if (do_stroke)
        ctx.stroke();
    if (do_fill)
        ctx.fill();
}

function draw_text(ctx, str, x, y, pts, style_str, color, halign, valign)
{
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

function make_time_str(minutes)
{
    var hours = Math.floor(minutes / 60);
    var min_digit_10 = Math.floor((minutes % 60) / 10);
    var min_digit_1 = minutes % 10;
    return '' + hours + ':' + min_digit_10 + '' + min_digit_1;
}

function make_font_size(pts, style_str)
{
    return style_str + ' ' + pts.toFixed(1) + 'px Helvetica';
}




function ImageLoaded()
{
    DrawAllPanels();  // TODO: This should just draw one, or queue it up
}




// Node.js hookups
module.exports.createStaffPanel = createStaffPanel;
module.exports.createChartPanel = createChartPanel;
module.exports.draw_text = draw_text;
module.exports.rounded_rect = rounded_rect;
module.exports.rounded_rect_nosides = rounded_rect_nosides;
module.exports.rounded_rect_leftonly = rounded_rect_leftonly;
module.exports.rgbToHex = rgbToHex;
module.exports.make_time_str = make_time_str;
module.exports.make_font_size = make_font_size;

