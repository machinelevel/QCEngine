/////////////////////////////////////////////////////////////////////////////
// qcengine_canvas.js
// Copyright 2000-2011 Eric Johnston
// qcengine@machinelevel.com
//
//  License:
//    (this is the zlib license, with item 4 added) 
//
//  This software is provided 'as-is', without any express or implied
//  warranty. In no event will the authors be held liable for any damages
//  arising from the use of this software.
//
//  Permission is granted to anyone to use this software for any purpose,
//  including commercial applications, and to alter it and redistribute it
//  freely, subject to the following restrictions:
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
//  Commercial interest: There is a C++ version of this code which runs much faster
//  and has SIMD and multi-core support. For more info, contact qcengine@machinelevel.com
//





/////////////////////////////////////////////////////////////////////////////
// The Widget classes
//
//

var allCanvases = new Array();
var draggedCanvas = null;
var draggedFrameCount = 0;

function QCanvas(canvas, div)
{
    this.canvas = canvas;
    this.div = div;
    div.qcanvas = this;
    this.widgets = new Array();
    this.mouseX = 0;
    this.mouseY = 0;
    if (this.canvas)
        this.canvas.qcanvas = this;

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
        }
    }

    this.setSize = function(width, height)
    {
        if (this.canvas)
        {
            this.canvas.width = width;
            this.canvas.height = height;
        }
        this.div.style.width = width;
        this.div.style.height = height;
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

    

    this.div.ondblclick = function(e)
    {
        e.Handled = true;
    }

    this.div.onmousedown = function(e)
    {
        this.qcanvas.getMousePos(e);

        for (var i = this.qcanvas.widgets.length - 1; i >= 0 && !e.Handled; --i)
        {
            e.Handled = this.qcanvas.widgets[i].mouseDown(
                this.qcanvas.mouseX - this.qcanvas.widgets[i].pos.x,
                this.qcanvas.mouseY - this.qcanvas.widgets[i].pos.y);
        }
        if (!e.handled)
        {
            // Start canvas drag
            this.qcanvas.dragMouseStartX = e.pageX;
            this.qcanvas.dragMouseStartY = e.pageY;
            this.qcanvas.dragCanvasStartX = parseInt(this.qcanvas.div.style.left);
            this.qcanvas.dragCanvasStartY = parseInt(this.qcanvas.div.style.top);
            draggedCanvas = this.qcanvas;
            draggedFrameCount = 0;
        }
        return false;   // Keep us from selecting text while dragging!!
    }

    this.div.onmouseup = function(e)
    {
        this.qcanvas.getMousePos(e);
        for (var i = this.qcanvas.widgets.length - 1; i >= 0 && !e.Handled; --i)
        {
            e.Handled = this.qcanvas.widgets[i].mouseUp(
                this.qcanvas.mouseX - this.qcanvas.widgets[i].pos.x,
                this.qcanvas.mouseY - this.qcanvas.widgets[i].pos.y);
        }
    }

    this.div.onmousemove = function(e)
    {
        for (var i = this.qcanvas.widgets.length - 1; i >= 0 && !e.Handled; --i)
        {
            e.Handled = this.qcanvas.widgets[i].mouseMove(
                this.qcanvas.mouseX - this.qcanvas.widgets[i].pos.x,
                this.qcanvas.mouseY - this.qcanvas.widgets[i].pos.y);
        }
    }
    return false;   // Keep us from selecting text while dragging!!
}

/*
document.onmousedown = function(e)
{
    if (draggedCanvas)
    {
        document.body.removeChild(draggedCanvas.div);
        document.body.appendChild(draggedCanvas.div);
    }
    return true;
}
*/

document.onmouseup = function(e)
{
    draggedCanvas = null;
    return true;
}

document.onmousemove = function(e)
{
    var mx = e.pageX;
    var my = e.pageY;
    if (draggedCanvas)
    {
        if (draggedFrameCount == 0)
        {
            document.body.removeChild(draggedCanvas.div);
            document.body.appendChild(draggedCanvas.div);
        }
        draggedFrameCount++;
        var x = draggedCanvas.dragCanvasStartX + mx - draggedCanvas.dragMouseStartX;
        var y = draggedCanvas.dragCanvasStartY + my - draggedCanvas.dragMouseStartY;
        draggedCanvas.div.style.left = x + "px";
        draggedCanvas.div.style.top = y + "px";
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
    divTag.id = "stopwatchDiv";
//    divTag.setAttribute("align","center");
    divTag.style.margin = "0px auto";
    divTag.style.position = 'absolute';
    divTag.style.left = x;
    divTag.style.top = y;
//    divTag.style.width = 500;
//    divTag.style.height = 50;
    divTag.style.border = '1px solid #999';
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

function createStopwatchPanel(myReg, x, y)
{
    var div = createDiv(x, y);
//    div.innerHTML = "new div!";
//    var button = document.createElement("button");
//    button.innerHTML = "a button";
//    div.appendChild(button);

    var canvas = document.createElement("canvas");
    div.appendChild(canvas);

    var qCanvas = new QCanvas(canvas, div);
    qCanvas.setSize(602/2+50, 854/2+20);

    var stopwatchQubit = 0x01;
    var watch = new QStopwatch(myReg, stopwatchQubit, qCanvas, new Vec2(0, 0));

    var center = watch.dialCenterPos();
    center.x -= 16;
    center.y -= 16;
    var thetaDegrees = -2;
    var dtheta = 19;
    var buttonRadius = 160;
    var buttonPos = radialPos(center, thetaDegrees, buttonRadius);
    new QNotCharm(myReg, qCanvas, buttonPos, stopwatchQubit, "not");
    buttonPos = radialPos(center, thetaDegrees + dtheta*1, buttonRadius);
    new QCoinTossCharm(myReg, qCanvas, buttonPos, stopwatchQubit, "random");
    buttonPos = radialPos(center, thetaDegrees + dtheta*2, buttonRadius);
    new QHadamardCharm(myReg, qCanvas, buttonPos, stopwatchQubit, "hadamard");
    buttonPos = radialPos(center, thetaDegrees + dtheta*3, buttonRadius);
    new QRotateCharm(myReg, qCanvas, buttonPos, stopwatchQubit, "rotate");
    buttonPos = radialPos(center, thetaDegrees + dtheta*4, buttonRadius);
    new QPhaseShiftCharm(myReg, qCanvas, buttonPos, stopwatchQubit, "phase shift");
    buttonPos = radialPos(center, thetaDegrees + dtheta*5, buttonRadius);
    new QCat(myReg, qCanvas, buttonPos);

    return qCanvas;
}

function createStaffPanel(myReg, x, y)
{
    var div = createDiv(x, y);
//    div.innerHTML = "new div!";
//    var button = document.createElement("button");
//    button.innerHTML = "a button";
//    div.appendChild(button);

    var canvas = document.createElement("canvas");
    div.appendChild(canvas);

    var qCanvas = new QCanvas(canvas, div);
    qCanvas.setSize(500, 150);

    new QStaff(myReg, qCanvas, new Vec2(0, 0));

    return qCanvas;
}

function createChartPanel(myReg, x, y)
{
    var div = createDiv(x, y);
//    div.innerHTML = "new div!";
//    var button = document.createElement("button");
//    button.innerHTML = "a button";
//    div.appendChild(button);

    var canvas = document.createElement("canvas");
    div.appendChild(canvas);

    var qCanvas = new QCanvas(canvas, div);
    qCanvas.setSize(500, 200);

    new QChart(myReg, qCanvas, new Vec2(0, 0));

    return qCanvas;
}



function createAllPanels(panelList)
{
    var numQubits = 1;
    var blockQubits = 1;
    var myReg = new QReg(numQubits, blockQubits, false);
    var myInt = new QInt(numQubits, myReg);
//    console.log("memory required: " + myReg.bytesRequired());
    myReg.activate();
    myReg.writeAll(1);

    var panel = createStopwatchPanel(myReg, 130, 360);
    panel.draw();
    panelList.push(panel);

    panel = createSetupPanel(myReg, 520, 100);
    panel.draw();
    panelList.push(panel);

    panel = createStaffPanel(myReg, 600, 470);
    panel.draw();
    panelList.push(panel);

    panel = createChartPanel(myReg, 580, 270);
    panel.draw();
    panelList.push(panel);

}



/////////////////////////////////////////////////////////////////



function DrawAllCanvases()
{
    for (var i = 0; i < allCanvases.length; ++i)
    {
        allCanvases[i].draw();
    }
}

function ImageLoaded()
{
    DrawAllCanvases();  // TODO: This should just draw one, or queue it up
}

function Initialize()
{
    createAllPanels(allCanvases);
    LoadUserName();
}
    
// Set it up!
Initialize();


