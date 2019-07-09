/////////////////////////////////////////////////////////////////////////////
// qcengine_setup.js
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
// The Setup panel
//
//

var qcEngineSetupPanel = null;

function createSetupPanel(qReg, x, y)
{
    qcEngineSetupPanel = this;
    this.qReg = qReg;
    this.div = createDiv(x, y);
    div.style.cssText += "background-color: #fff;";
//    div.innerHTML = "QC Engine Setup<br/>";
    var button = document.createElement("button");
//    button.innerHTML = "a button";
//    div.appendChild(button);

    var singlePrecisionChecked = "";
    var doublePrecisionChecked = "";
    if (qReg.doublePrecision)
        doublePrecisionChecked = 'checked="checked"';
    else
        singlePrecisionChecked = 'checked="checked"';

    var divHTML = "";
    divHTML += '<font face="Tahoma, Digital, Arial, Helvetica, sans-serif" size="2">';
    divHTML += '<table>';
    divHTML += '  <tr>';
    divHTML += '    <td><font size="4"><b>QC Engine Setup</b></font></td>';
    divHTML += '  </tr><tr>';
    divHTML += '    <td>';
    divHTML += '      <table>';
    divHTML += '        <tr>';
    divHTML += '          <td>';
    divHTML += '            Total Qubits ';
    divHTML += '            <input type="text" id="numQubitsSet" size="4" value="' + qReg.numQubits + '"/>';
    divHTML += '            <input type="button" onclick="qcEngineSetupPanel.incQubits(1, 1);" value="+" />';
    divHTML += '            <input type="button" onclick="qcEngineSetupPanel.incQubits(-1, -1);" value="-" />';
    divHTML += '          </td>';
    divHTML += '        </tr><tr>';
    divHTML += '          <td>';
    divHTML += '            Block Count ';
    divHTML += '            <input type="text" id="numBlockQubitsSet" size="4" value="' + qReg.numBlockQubits + '"/>';
    divHTML += '            <input type="button" onclick="qcEngineSetupPanel.incQubits(0, 1);" value="+" />';
    divHTML += '            <input type="button" onclick="qcEngineSetupPanel.incQubits(0, -1);" value="-" />';
    divHTML += '          </td>';
    divHTML += '        </tr><tr>';
    divHTML += '          <td><input type="radio" id="singlePrecisionRadio" name="group1" onclick="qcEngineSetupPanel.checkQCSettings();" value="Single" ' + singlePrecisionChecked + '>Single precision</input></td>';
    divHTML += '        </tr><tr>';
    divHTML += '          <td><input type="radio" id="doublePrecisionRadio" name="group1" onclick="qcEngineSetupPanel.checkQCSettings();" value="Double" ' + doublePrecisionChecked + '>Double precision</input></td>';
    divHTML += '        </tr><tr>';
    divHTML += '          <td><input type="button" onclick="startQCSim();" value="Start QC Simulation" style="background-color:#8f8; color:#000;"/></td>';
    divHTML += '        </tr><tr>';
    divHTML += '        </tr><tr>';
    divHTML += '          <td><input type="button" onclick="stopQCSim();" value="Stop QC Simulation" style="background-color:#f88; color:#000;"/></td>';
    divHTML += '        </tr><tr>';
// divHTML += '<form action="demo_form.asp" method="get"><input type="number" name="points" min="0" max="10" step="3" value="6" /><input type="submit" />';

    divHTML += '        </tr>';
    divHTML += '      </table>';
    divHTML += '    </td>';
    divHTML += '    <td valign="top">';
    divHTML += '      <span id="setupNotesSpan"></span>';
    divHTML += '    </td>';
    divHTML += '  </tr>';
    divHTML += '</table>';
    divHTML += '</font>';
//    console.log(divHTML);

    this.div.innerHTML = divHTML;
    this.notesSpan = document.getElementById("setupNotesSpan");
    this.numQubitsInput = document.getElementById("numQubitsSet");
    this.numBlockQubitsInput = document.getElementById("numBlockQubitsSet");
    this.singlePrecisionRadio = document.getElementById("singlePrecisionRadio");
    this.doublePrecisionRadio = document.getElementById("doublePrecisionRadio");
    this.panel = new Panel(null, this.div);
    this.printNotes = function(str)
    {
        this.notesSpan.innerHTML = str;
    }

    this.incQubits = function(total, block)
    {
        var nq = parseFloat(this.numQubitsInput.value);
        nq += total;
        if (nq < 1)
            nq = 1;
        this.numQubitsInput.value = nq;

        var nbq = parseFloat(this.numBlockQubitsInput.value);
        nbq += block;
        if (nbq < 1)
            nbq = 1;
        if (nbq > nq)
            nbq = nq;
        this.numBlockQubitsInput.value = nbq;

        this.checkQCSettings();
    }

    this.printCountFromLog2 = function(sizeLog2)
    {
    }

    this.printDataSizeFromLog2 = function(sizeLog2)
    {
        var str = '';
        var sizeTop = sizeLog2;
        while (sizeTop >= 10)
            sizeTop -= 10;
        sizeTop = 1 << sizeTop;

        if (sizeLog2 < 10)
            str += sizeTop + ' bytes';
        else if (sizeLog2 < 20)
            str += sizeTop + ' KB';
        else if (sizeLog2 < 30)
            str += sizeTop + ' MB';
        else if (sizeLog2 < 40)
            str += sizeTop + ' GB';
        else if (sizeLog2 < 50)
            str += sizeTop + ' TB';
        else
        {
            str += 'about ';
            str += sizeTop;
            for (var i = sizeLog2; i >= 50; i -= 10)
                str += ',000';
            str += ' TB';
        }
        return str;
    }

    this.sizeReport = function(doComment, numQubits, numBlockQubits, useDouble)
    {
        var maxJavaScriptBits = 53; // this is the number of useful bitwise-integer-op bits JavaScript supports currently

        var report = '';
        // Note: This function should be prepared to get unreasonable values and still provide useful info.

        // Num Qubits
        report += numQubits + ' qubits, ';
        if (useDouble)
            report += 'double precision<br/>';
        else
            report += 'single precision<br/>';

        
        var valueBytesLog2 = 3;
        if (useDouble)
            valueBytesLog2++;

        var totalDataSizeLog2 = numQubits + valueBytesLog2;
        report += 'Required data size: ' 
                    + (1 << valueBytesLog2) + '*2<sup>' + numQubits + '</sup> = '
                    + this.printDataSizeFromLog2(totalDataSizeLog2);

        return report;
    }

    this.checkQCSettings = function()
    {
        var notes = '';
        notes += '<b>Current QC Status: </b>';
        if (this.qReg.active)
        {
            notes += 'Active and running, all systems go<br/>';
            notes += this.sizeReport(false, this.qReg.numQubits, this.qReg.numBlockQubits, this.qReg.doublePrecision);
        }
        else
            notes += 'Inactive. Press "Start QC Simulation" to activate.<br/>';

        notes += '<hr/>';

        var nq = parseFloat(this.numQubitsInput.value);
        var nbq = parseFloat(this.numBlockQubitsInput.value);
        var useDouble = false;
        if (this.doublePrecisionRadio.checked)
            useDouble = true;

        notes += '<b>Requested QC Status: </b>';
        notes += this.sizeReport(true, nq, nbq, useDouble);

        this.printNotes(notes);
    }

    this.stopQCSim = function()
    {
        this.qReg.deactivate();
        this.checkQCSettings();
    }

    this.startQCSim = function()
    {
        var nq = parseFloat(this.numQubitsInput.value);
        var nbq = parseFloat(this.numBlockQubitsInput.value);
        var useDouble = false;
        if (this.doublePrecisionRadio.checked)
            useDouble = true;

        this.qReg.deactivate();
        this.qReg.setSize(nq, nbq, useDouble);
        this.qReg.activate();

        this.checkQCSettings();
    }

    /////////////////////////////////////
    // Now initialize some things
    this.checkQCSettings();
    return this.panel;
}

// Node.js hookups
module.exports.createSetupPanel = createSetupPanel;
