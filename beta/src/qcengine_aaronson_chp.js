/////////////////////////////////////////////////////////////////////////////
// qcengine_aaronson_chp.js
// This is adapted from CHP by Scott Aaronson and Daniel Gottesman
// which can be found here: http://www.scottaaronson.com/chp/
//
// The rest is Copyright 2016 Eric Johnston, Machine Level
// qcengine@machinelevel.com
//
// Big thanks to Mercedes Gimeno-Segovia for suggesting that I add this
// support to QCEngine.
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
//
//  1a.  ESPECIALLY be sure to credit Scott and Daniel for the CHP work on which
//       this file is based. See notes at http://www.scottaaronson.com/chp/
//
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



////////////////////////////////////////////////////////
// CHP Stabilizer sim code, January 2016
//
// This is adapted from CHP by Scott Aaronson and Daniel Gottesman
// which can be found here: http://www.scottaaronson.com/chp/


// Quantum circuit
//function QProg()
//{
//    long n;         // # of qubits
//    long T;         // # of gates
//    char *a; // Instruction opcode
//    long *b; // Qubit 1
//    long *c; // Qubit 2 (target for CNOT)
//    int DISPQSTATE; // whether to print the state (q for final state only, Q for every iteration)
//    int DISPTIME; // whether to print the execution time
//    int SILENT;         // whether NOT to print measurement results
//    int DISPPROG; // whether to print instructions being executed as they're executed
//    int SUPPRESSM; // whether to suppress actual computation of determinate measurement results
//};

// Quantum state
//struct QState
//{
//    // To save memory and increase speed, the bits are packed 32 to an unsigned long
//    long n;         // # of qubits
//    unsigned long **x; // (2n+1)*n matrix for stabilizer/destabilizer x bits (there's one "scratch row" at
//    unsigned long **z; // (2n+1)*n matrix for z bits                                                 the bottom)
//    int *r;         // Phase bits: 0 for +1, 1 for i, 2 for -1, 3 for -i.  Normally either 0 or 2.
//    unsigned long pw[32]; // pw[i] = 2^i
//    long over32; // floor(n/8)+1
//};



function CHPSimulator()
{
    var CNOT     = 0;
    var HADAMARD = 1;
    var PHASE    = 2;
    var MEASURE  = 3;
    this.active = false;
    this.verbose = false;

    this.reset = function(qReg, targetQubits, this_instruction)
    {
        this.qReg = qReg;
        qc.start();
        if (qc)
        {
            qc.chp = this;
            if (qReg == null)
                qReg = qc.qReg;
        }

        if (qReg)
        {
            qReg.chp = this;
            var q = {};
            this.qstate = q;
            this.initstae_(q, qReg.numQubits);
            if (this.verbose)
            {
                this.printket(q);
                this.printstate(q);
            }
        }
    }


    this.cnot = function(/*struct QState * */q, /*long*/ b, /*long*/ c)

    // Apply a CNOT gate with control b and target c

    {
        if (q == null)
            q = this.qstate;
        var /*long*/ i;
        var /*long*/ b5;
        var /*long*/ c5;
        var /*unsigned long*/ pwb;
        var /*unsigned long*/ pwc;

        b5 = b>>5;
        c5 = c>>5;
        pwb = q.pw[b&31];
        pwc = q.pw[c&31];
        for (i = 0; i < 2*q.n; i++)
        {
             if (q.x[i][b5]&pwb) q.x[i][c5] ^= pwc;
             if (q.z[i][c5]&pwc) q.z[i][b5] ^= pwb;
             if ((q.x[i][b5]&pwb) && (q.z[i][c5]&pwc) &&
                 (q.x[i][c5]&pwc) && (q.z[i][b5]&pwb))
                    q.r[i] = (q.r[i]+2)%4;
            if ((q.x[i][b5]&pwb) && (q.z[i][c5]&pwc) &&
                !(q.x[i][c5]&pwc) && !(q.z[i][b5]&pwb))
                    q.r[i] = (q.r[i]+2)%4;
        }

        if (this.verbose)
        {
            this.printket(q, 'after CNOT:');
            this.printstate(q);
        }
        return;

    }



    this.hadamard = function(/*struct QState * */q, /*long*/ b)

    // Apply a Hadamard gate to qubit b

    {
        if (q == null)
            q = this.qstate;
        var /*long*/ i;
        var /*unsigned long*/ tmp;
        var /*long*/ b5;
        var /*unsigned long*/ pw;

        b5 = b>>5;
        pw = q.pw[b&31];
        for (i = 0; i < 2*q.n; i++)
        {
             tmp = q.x[i][b5];
             q.x[i][b5] ^= (q.x[i][b5] ^ q.z[i][b5]) & pw;
             q.z[i][b5] ^= (q.z[i][b5] ^ tmp) & pw;
             if ((q.x[i][b5]&pw) && (q.z[i][b5]&pw)) q.r[i] = (q.r[i]+2)%4;
        }

        if (this.verbose)
        {
            this.printket(q, 'after HAD:');
            this.printstate(q);
        }
        return;

    }



    this.phase = function(/*struct QState * */q, /*long*/ b)

    // Apply a phase gate (|0>->|0>, |1>->i|1>) to qubit b

    {
        if (q == null)
            q = this.qstate;
        var /*long*/ i;
        var /*long*/ b5;
        var /*unsigned long*/ pw;

        b5 = b>>5;
        pw = q.pw[b&31];
        for (i = 0; i < 2*q.n; i++)
        {
             if ((q.x[i][b5]&pw) && (q.z[i][b5]&pw)) q.r[i] = (q.r[i]+2)%4;
             q.z[i][b5] ^= q.x[i][b5]&pw;
        }

        if (this.verbose)
        {
            this.printket(q, 'after PHASE:');
            this.printstate(q);
        }
        return;

    }



    this.rowcopy = function(/*struct QState * */q, /*long*/ i, /*long*/ k)

    // Sets row i equal to row k

    {
        var /*long*/ j;

        for (j = 0; j < q.over32; j++)
        {
             q.x[i][j] = q.x[k][j];
             q.z[i][j] = q.z[k][j];
        }
        q.r[i] = q.r[k];

        return;

    }



    this.rowswap = function(/*struct QState * */q, /*long*/ i, /*long*/ k)

    // Swaps row i and row k

    {
        this.rowcopy(q, 2*q.n, k);
        this.rowcopy(q, k, i);
        this.rowcopy(q, i, 2*q.n);

        return;

    }



    this.rowset = function(/*struct QState * */q, /*long*/ i, /*long*/ b)

    // Sets row i equal to the bth observable (X_1,...X_n,Z_1,...,Z_n)

    {
        var /*long*/ j;
        var /*long*/ b5;
        var /*unsigned long*/ b31;

        for (j = 0; j < q.over32; j++)
        {
             q.x[i][j] = 0;
             q.z[i][j] = 0;
        }
        q.r[i] = 0;
        if (b < q.n)
        {
             b5 = b>>5;
             b31 = b&31;
             q.x[i][b5] = q.pw[b31];
        }
        else
        {
             b5 = (b - q.n)>>5;
             b31 = (b - q.n)&31;
             q.z[i][b5] = q.pw[b31];
        }

        return;

    }



    /*int*/
    this.clifford = function(/*struct QState * */q, /*long*/ i, /*long*/ k)

    // Return the phase (0,1,2,3) when row i is LEFT-multiplied by row k

    {
        var /*long*/ j;
        var /*long*/ l;
        var /*unsigned long*/ pw;
        var /*long*/ e=0; // Power to which i is raised

        for (j = 0; j < q.over32; j++)
             for (l = 0; l < 32; l++)
             {
                     pw = q.pw[l];
                     if ((q.x[k][j]&pw) && (!(q.z[k][j]&pw))) // X
                     {
                             if ((q.x[i][j]&pw) && (q.z[i][j]&pw)) e++;         // XY=iZ
                             if ((!(q.x[i][j]&pw)) && (q.z[i][j]&pw)) e--;         // XZ=-iY
                     }
                     if ((q.x[k][j]&pw) && (q.z[k][j]&pw))                                 // Y
                     {
                             if ((!(q.x[i][j]&pw)) && (q.z[i][j]&pw)) e++;         // YZ=iX
                             if ((q.x[i][j]&pw) && (!(q.z[i][j]&pw))) e--;         // YX=-iZ
                     }
                     if ((!(q.x[k][j]&pw)) && (q.z[k][j]&pw))                         // Z
                     {
                             if ((q.x[i][j]&pw) && (!(q.z[i][j]&pw))) e++;         // ZX=iY
                             if ((q.x[i][j]&pw) && (q.z[i][j]&pw)) e--;         // ZY=-iX
                     }
             }

        e = (e+q.r[i]+q.r[k])%4;
        if (e>=0) return e;
             else return e+4;

    }



    this.rowmult = function(/*struct QState * */q, /*long*/ i, /*long*/ k)

    // Left-multiply row i by row k

    {
        var /*long*/ j;

        q.r[i] = this.clifford(q,i,k);
        for (j = 0; j < q.over32; j++)
        {
             q.x[i][j] ^= q.x[k][j];
             q.z[i][j] ^= q.z[k][j];
        }

        return;

    }



    this.printstate = function(/*struct QState * */q)

    // Print the destabilizer and stabilizer for state q

    {
        if (q == null)
            q = this.qstate;
        var /*long*/ i;
        var /*long*/ j;
        var /*long*/ j5;
        var /*unsigned long*/ pw;

        for (i = 0; i < 2*q.n; i++)
        {
             if (i == q.n)
             {
                     this.print("\n");
                     for (j = 0; j < q.n+1; j++)
                             this.print("-");
             }
             if (q.r[i]==2) this.print("\n-");
             else this.print("\n+");
             for (j = 0; j < q.n; j++)
             {
                     j5 = j>>5;
                     pw = q.pw[j&31];
                     if ((!(q.x[i][j5]&pw)) && (!(q.z[i][j5]&pw)))         this.print("I");
                     if ((q.x[i][j5]&pw) && (!(q.z[i][j5]&pw)))         this.print("X");
                     if ((q.x[i][j5]&pw) && (q.z[i][j5]&pw))                 this.print("Y");
                     if ((!(q.x[i][j5]&pw)) && (q.z[i][j5]&pw))         this.print("Z");
             }
        }
        this.print("\n");

        return;

    }



    /*int*/
    this.measure = function(/*struct QState * */q, /*long*/ b, /*int*/ sup)

    // Measure qubit b
    // Return 0 if outcome would always be 0
    //                 1 if outcome would always be 1
    //                 2 if outcome was random and 0 was chosen
    //                 3 if outcome was random and 1 was chosen
    // sup: 1 if determinate measurement results should be suppressed, 0 otherwise

    {
        if (q == null)
            q = this.qstate;
        var /*int*/ ran = 0;
        var /*long*/ i;
        var /*long*/ p; // pivot row in stabilizer
        var /*long*/ m; // pivot row in destabilizer
        var /*long*/ b5;
        var /*unsigned long*/ pw;

        b5 = b>>5;
        pw = q.pw[b&31];
        for (p = 0; p < q.n; p++)         // loop over stabilizer generators
        {
             if (q.x[p+q.n][b5]&pw) ran = 1;         // if a Zbar does NOT commute with Z_b (the
             if (ran) break;                                                 // operator being measured), then outcome is random
        }

        // If outcome is indeterminate
        if (ran)
        {
            var random_bit = 0|Math.floor(Math.random() * 2);
            this.rowcopy(q, p, p + q.n);                         // Set Xbar_p := Zbar_p
            this.rowset(q, p + q.n, b + q.n);                 // Set Zbar_p := Z_b
            q.r[p + q.n] = random_bit << 1;                 // moment of quantum randomness
            for (i = 0; i < 2*q.n; i++)                 // Now update the Xbar's and Zbar's that don't commute with
                    if ((i!=p) && (q.x[i][b5]&pw))         // Z_b
                            this.rowmult(q, i, p);
            if (q.r[p + q.n]) return 3;
            else return 2;
        }

        // If outcome is determinate
        if ((!ran) && (!sup))
        {
             for (m = 0; m < q.n; m++)                         // Before we were checking if stabilizer generators commute
                     if (q.x[m][b5]&pw) break;                 // with Z_b; now we're checking destabilizer generators
             this.rowcopy(q, 2*q.n, m + q.n);
             for (i = m+1; i < q.n; i++)
                     if (q.x[i][b5]&pw)
                             this.rowmult(q, 2*q.n, i + q.n);
             if (q.r[2*q.n]) return 1;
             else return 0;
             /*for (i = m+1; i < q.n; i++)
                     if (q.x[i][b5]&pw)
                     {
                             this.rowmult(q, m + q.n, i + q.n);
                             this.rowmult(q, i, m);
                     }
             return (int)q.r[m + q.n];*/
        }

        return 0;

    }



    /*long*/
    this.gaussian = function(/*struct QState * */q)

    // Do Gaussian elimination to put the stabilizer generators in the following form:
    // At the top, a minimal set of generators containing X's and Y's, in "quasi-upper-triangular" form.
    // (Return value = number of such generators = log_2 of number of nonzero basis states)
    // At the bottom, generators containing Z's only in quasi-upper-triangular form.

    {
        if (q == null)
            q = this.qstate;
        var /*long*/ i = q.n;
        var /*long*/ k;
        var /*long*/ k2;
        var /*long*/ j;
        var /*long*/ j5;
        var /*long*/ g; // Return value
        var /*unsigned long*/ pw;

        for (j = 0; j < q.n; j++)
        {
             j5 = j>>5;
             pw = q.pw[j&31];
             for (k = i; k < 2*q.n; k++) // Find a generator containing X in jth column
                     if (q.x[k][j5]&pw) break;
             if (k < 2*q.n)
             {
                     this.rowswap(q, i, k);
                     this.rowswap(q, i-q.n, k-q.n);
                     for (k2 = i+1; k2 < 2*q.n; k2++)
                             if (q.x[k2][j5]&pw)
                             {
                                     this.rowmult(q, k2, i);         // Gaussian elimination step
                                     this.rowmult(q, i-q.n, k2-q.n);
                             }
                     i++;
             }
        }
        g = i - q.n;

        for (j = 0; j < q.n; j++)
        {
             j5 = j>>5;
             pw = q.pw[j&31];
             for (k = i; k < 2*q.n; k++) // Find a generator containing Z in jth column
                     if (q.z[k][j5]&pw) break;
             if (k < 2*q.n)
             {
                     this.rowswap(q, i, k);
                     this.rowswap(q, i-q.n, k-q.n);
                     for (k2 = i+1; k2 < 2*q.n; k2++)
                             if (q.z[k2][j5]&pw)
                             {
                                     this.rowmult(q, k2, i);
                                     this.rowmult(q, i-q.n, k2-q.n);
                             }
                     i++;
             }
        }

        return g;

    }



    /*long*/
    this.innerprod = function(/*struct QState * */q1, /*struct QState * */q2)

    // Returns -1 if q1 and q2 are orthogonal
    // Otherwise, returns a nonnegative integer s such that the inner product is (1/sqrt(2))^s

    {

        return 0;

    }



    this.printbasisstate = function(/*struct QState * */q)

    // Prints the result of applying the Pauli operator in the "scratch space" of q to |0...0>

    {
        if (q == null)
            q = this.qstate;
        var /*long*/ j;
        var /*long*/ j5;
        var /*unsigned long*/ pw;
        var /*int*/ e = q.r[2*q.n];

        for (j = 0; j < q.n; j++)
        {
             j5 = j>>5;
             pw = q.pw[j&31];
             if ((q.x[2*q.n][j5]&pw) && (q.z[2*q.n][j5]&pw))         // Pauli operator is "Y"
                     e = (e+1)%4;
        }
        if (e==0) this.print("\n +|");
        if (e==1) this.print("\n+i|");
        if (e==2) this.print("\n -|");
        if (e==3) this.print("\n-i|");

        for (j = 0; j < q.n; j++)
        {
             j5 = j>>5;
             pw = q.pw[j&31];
             if (q.x[2*q.n][j5]&pw) this.print("1");
                     else this.print("0");
        }
        this.print(">");

        return;

    }



    this.seed = function(/*struct QState * */q, /*long*/ g)

    // Finds a Pauli operator P such that the basis state P|0...0> occurs with nonzero amplitude in q, and
    // writes P to the scratch space of q.  For this to work, Gaussian elimination must already have been
    // performed on q.  g is the return value from gaussian(q).

    {
        var /*long*/ i;
        var /*long*/ j;
        var /*long*/ j5;
        var /*unsigned long*/ pw;
        var /*int*/ f;
        var /*long*/ min;

        q.r[2*q.n] = 0;
        for (j = 0; j < q.over32; j++)
        {
             q.x[2*q.n][j] = 0;         // Wipe the scratch space clean
             q.z[2*q.n][j] = 0;
        }
        for (i = 2*q.n - 1; i >= q.n + g; i--)
        {
             f = q.r[i];
             for (j = q.n - 1; j >= 0; j--)
             {
                     j5 = j>>5;
                     pw = q.pw[j&31];
                     if (q.z[i][j5]&pw)
                     {
                             min = j;
                             if (q.x[2*q.n][j5]&pw) f = (f+2)%4;
                     }
             }
             if (f==2)
             {
                     j5 = min>>5;
                     pw = q.pw[min&31];
                     q.x[2*q.n][j5] ^= pw;         // Make the seed consistent with the ith equation
             }
        }

        return;

    }



    this.printket = function(/*struct QState * */q, message)

    // Print the state in ket notation (warning: could be huge!)

    {
        if (q == null)
            q = this.qstate;
        var /*long*/ g;         // log_2 of number of nonzero basis states
        var /*unsigned long*/ t;
        var /*unsigned long*/ t2;
        var /*long*/ i;

        if (message)
            this.print(message);

        g = this.gaussian(q);
        this.print("\n2^"+g+" nonzero basis states");
        if (g > 31)
        {
             this.print("\nState is WAY too big to print");
             return;
        }

        this.seed(q, g);
        this.printbasisstate(q);
        for (t = 0; t < q.pw[g]-1; t++)
        {
            t2 = t ^ (t+1);
             for (i = 0; i < g; i++)
                     if (t2 & q.pw[i])
                             this.rowmult(q, 2*q.n, q.n + i);
             this.printbasisstate(q);
        }
        this.print("\n");

        return;

    }



    this.runprog = function(/*struct QState * */q, /*struct QProg * */h)

    // Simulate the quantum circuit

    {
        if (q == null)
            q = this.qstate;
        var /*long*/ t;
        var /*int*/ m; // measurement result
        var /*time_t*/ tp;
        var /*double*/ dt;
        var /*char*/ mvirgin = 1;

        /*time(&tp);*/
        tp = new Date().getTime();

        for (t = 0; t < h.T; t++)
        {
             if (h.a[t]==CNOT) this.cnot(q,h.b[t],h.c[t]);
             if (h.a[t]==HADAMARD) this.hadamard(q,h.b[t]);
             if (h.a[t]==PHASE) this.phase(q,h.b[t]);
             if (h.a[t]==MEASURE)
             {
                     if (mvirgin && h.DISPTIME)
                     {
                             /*dt = difftime(time(0),tp);*/
                             dt = new Date().getTime() - tp;
                             this.print("\nGate time: "+dt+" seconds");
                             this.print("\nTime per 10000 gates: "+(dt*10000.0/(h.T - h.n))+" seconds");
                             /*time(&tp);*/
                             tp = new Date().getTime();
                     }
                     mvirgin = 0;
                     m = this.measure(q,h.b[t],h.SUPPRESSM);
                     if (!h.SILENT)
                     {
                             this.print("\nOutcome of measuring qubit "+h.b[t]+": ");
                             if (m>1) this.print(""+(m-2)+" (random)");
                             else this.print(""+m);
                     }
             }
             if (h.DISPPROG)
             {
                     if (h.a[t]==CNOT)         this.print("\nCNOT "+h.b[t]+"->"+h.c[t]+"");
                     if (h.a[t]==HADAMARD) this.print("\nHadamard "+h.b[t]+"");
                     if (h.a[t]==PHASE)         this.print("\nPhase "+h.b[t]+"");
             }
        }
        this.print("\n");
        if (h.DISPTIME)
        {
             /*dt = difftime(time(0),tp);*/
             dt = new Date().getTime() - tp;
             this.print("\nMeasurement time: "+dt+" seconds");
             this.print("\nTime per 10000 measurements: "+(dt*10000.0/h.n)+" seconds\n");
        }
        if (h.DISPQSTATE)
        {
             printf("\nFinal state:");
             this.printstate(q);
             this.gaussian(q);
             this.printstate(q);
             this.printket(q);
        }
        return;

    }



    this.preparestate = function(/*struct QState * */q, /*char * */s)

    // Prepare the initial state's "input"

    {
        var /*long*/ b;

        for (b = 0; b < s.length; b++)
        {
             if (s[b]=='Z')
             {
                     this.hadamard(q,b);
                     this.phase(q,b);
                     this.phase(q,b);
                     this.hadamard(q,b);
             }
             if (s[b]=='x') hadamard(q,b);
             if (s[b]=='X')
             {
                     this.hadamard(q,b);
                     this.phase(q,b);
                     this.phase(q,b);
             }this.
             if (s[b]=='y')
             {
                     this.hadamard(q,b);
                     this.phase(q,b);
             }
             if (s[b]=='Y')
             {
                     this.hadamard(q,b);
                     this.phase(q,b);
                     this.phase(q,b);
                     this.phase(q,b);                 
             }
        }

        return;

    }

    this.print = function(str)
    {
        qc.print(str);
//        console.log(str);
    }

    this.malloc_char = function(count)
    {
        // ej TODO: Assume this was written for 32-bit, but then test 64-bit
        var bytes_per_item = 1;
        return new Int8Array(new ArrayBuffer(count * bytes_per_item));
    }

    this.malloc_long = function(count)
    {
        // ej TODO: Assume this was written for 32-bit, but then test 64-bit
        var bytes_per_item = 4;
        return new Int32Array(new ArrayBuffer(count * bytes_per_item));
    }

    this.malloc_unsigned_long = function(count)
    {
        // ej TODO: Assume this was written for 32-bit, but then test 64-bit
        var bytes_per_item = 4;
        return new Uint32Array(new ArrayBuffer(count * bytes_per_item));
    }

    this.malloc_int = function(count)
    {
        // ej TODO: Assume this was written for 32-bit, but then test 64-bit
        var bytes_per_item = 4;
        return new Int32Array(new ArrayBuffer(count * bytes_per_item));
    }

    this.initstae_ = function(/*struct QState * */q, /*long*/ n, /*char * */s)

    // Initialize state q to have n qubits, and input specified by s

    {
        var /*long*/ i;
        var /*long*/ j;

        q.n = n;
        // ej TODO: Make these efficient multi-arrays
        q.x = new Array(2*q.n + 1);
        q.z = new Array(2*q.n + 1);
        q.r = this.malloc_int((2*q.n + 1) /* * sizeof(int) */);
        q.over32 = (q.n>>5) + 1;

        // ej TODO: replace q.pw with bitshifting, and test speed
        q.pw = this.malloc_unsigned_long(32);
        q.pw[0] = 1;
        for (i = 1; i < 32; i++)
             q.pw[i] = 2*q.pw[i-1];
        for (i = 0; i < 2*q.n + 1; i++)
        {
             q.x[i] = this.malloc_unsigned_long(q.over32 /* * sizeof(unsigned long) */);
             q.z[i] = this.malloc_unsigned_long(q.over32 /* * sizeof(unsigned long) */);
             for (j = 0; j < q.over32; j++)
             {
                     q.x[i][j] = 0;
                     q.z[i][j] = 0;
             }
             if (i < q.n)
                     q.x[i][i>>5] = q.pw[i&31];
             else if (i < 2*q.n)
             {
                     j = i-q.n;
                     q.z[i][j>>5] = q.pw[j&31];
             }
             q.r[i] = 0;
        }
        if (this.verbose)
        {
            this.printket(q, 'after init:');
            this.printstate(q);
        }
        if (s) this.preparestate(q, s);
        if (this.verbose)
        {
            this.printket(q, 'after prepare:');
            this.printstate(q);
        }

        return;

    }


    this.parseprog = function(/*struct QProg * */h, /*char * */program, /*char * */params)

    // Read a quantum circuit from filename fn, with optional parameters params
    // ej's note: This is like readprog(), except it takes arrays of strings
    //            instead of file names

    {
        var /*long*/ t;
        var /*char fn2[255]*/ fn2;
        /*FILE *fp;*/
        var /*char*/ c=0;
        var /*long*/ val;
        /*var /*long l;*/

        h.DISPQSTATE = 0;
        h.DISPTIME = 0;
        h.SILENT = 0;
        h.DISPPROG = 0;
        h.SUPPRESSM = 0;
        if (params)
        {
             for (t = 1; t < params.length; t++)
             {
                     if ((params[t]=='q')||(params[t]=='Q')) h.DISPQSTATE = 1;
                     if ((params[t]=='p')||(params[t]=='P')) h.DISPPROG = 1;
                     if ((params[t]=='t')||(params[t]=='T')) h.DISPTIME = 1;
                     if ((params[t]=='s')||(params[t]=='S')) h.SILENT = 1;
                     if ((params[t]=='m')||(params[t]=='M')) h.SUPPRESSM = 1;
             }
        }

        var line = 0;
        while (line < program.length && program[line] != '#')
            ++line;
        if (line >= program.length)
        {
            this.print('Error: empty program, no # found.\n');
            return;
        }
        var first_line = line + 1;
        line = first_line;

        h.T = 0;
        h.n = 0;
        while (line < program.length)
        {
             var tokens = program[line].split(' ');
             if (tokens.length >= 2)
             {
                 var c = tokens[0][0];
                 var val = parseInt(tokens[1]);
                 if (val+1 > h.n) h.n = val+1;
                 if ((c=='c')||(c=='C'))
                 {
                    val = parseInt(tokens[2]);
                    if (val+1 > h.n) h.n = val+1;
                 }
                 h.T++;
             }
             line++;
        }

        h.a = this.malloc_char(h.T/* * sizeof(char)*/);
        h.b = this.malloc_long(h.T/* * sizeof(long)*/);
        h.c = this.malloc_long(h.T/* * sizeof(long)*/);

        line = first_line;

        t=0;
        while (line < program.length)
        {
             var tokens = program[line].split(' ');
             if (tokens.length >= 2)
             {
                 var c = tokens[0][0];
                 h.b[t] = parseInt(tokens[1]);
                 if ((c=='c')||(c=='C')) h.a[t] = CNOT;
                 if ((c=='h')||(c=='H')) h.a[t] = HADAMARD;
                 if ((c=='p')||(c=='P')) h.a[t] = PHASE;
                 if ((c=='m')||(c=='M')) h.a[t] = MEASURE;

                 if (h.a[t]==CNOT)
                    h.c[t] = parseInt(tokens[2]);
                 else
                    h.c[t] = 0;
                 t++;
             }
             line++;
        }
        return;

    }

    this.print_program = function(qprog)
    {
        this.print('program:');
        var num_qubits = qprog.n;
        var num_instructions = qprog.T;
        var target = new BitField(0, num_qubits);
        var cond = new BitField(0, num_qubits);
        for (var i = 0; i < num_instructions; ++i)
        {
            var inst = qprog.a[i];
            var a_bit = qprog.b[i];
            var b_bit = qprog.c[i];

            if (inst == CNOT)
                this.print('  CNOT ' + a_bit + ' ' + b_bit);
            else if (inst == HADAMARD)
                this.print('  HAD  ' + a_bit);
            else if (inst == PHASE)
                this.print('  PH   ' + a_bit);
            else if (inst == MEASURE)
                this.print('  MEAS ' + a_bit);
        }
    }

    this.convert_chp_program_to_qcengine = function(qprog)
    {
        var num_qubits = qprog.n;
        var num_instructions = qprog.T;
        var a_bf = new BitField(0, num_qubits);
        var b_bf = new BitField(0, num_qubits);

        if (qc.qReg.numQubits < num_qubits)
            qc.reset(num_qubits);

        for (var i = 0; i < num_qubits; ++i)
            a_bf.setBit(i, 1);
        qc.write(0, a_bf);
        
        for (var i = 0; i < num_instructions; ++i)
        {
            var inst = qprog.a[i];
            var a_bit = qprog.b[i];
            var b_bit = qprog.c[i];

            a_bf.set(0);
            a_bf.setBit(a_bit, 1);
            if (inst == CNOT)
            {
                b_bf.set(0);
                b_bf.setBit(b_bit, 1);
                qc.cnot(b_bf, a_bf);
            }
            else if (inst == HADAMARD)
                qc.hadamard(a_bf);
            else if (inst == PHASE)
                qc.phase(90, a_bf);
            else if (inst == MEASURE)
                qc.read(a_bf);
        }
        a_bf.recycle();
        b_bf.recycle();
    }

    this.parse_chp_commands = function(program_str)
    {
        this.qprog = {};
        this.parseprog(this.qprog, program_str, '');
        this.print_program(this.qprog);
        this.convert_chp_program_to_qcengine(this.qprog);
    }

    this.transferLogicalToCHP = function()
    {
        // ej TODO transfer more states
        this.reset(this.qReg);
    }



    this.transferBasisStateToLogical = function(/*struct QState * */q)

    // Prints the result of applying the Pauli operator in the "scratch space" of q to |0...0>

    {
        if (this.qReg.disableSimulation)
            return;
        var /*long*/ j;
        var /*long*/ j5;
        var /*unsigned long*/ pw;
        var /*int*/ e = q.r[2*q.n];

        for (j = 0; j < q.n; j++)
        {
             j5 = j>>5;
             pw = q.pw[j&31];
             if ((q.x[2*q.n][j5]&pw) && (q.z[2*q.n][j5]&pw))         // Pauli operator is "Y"
                     e = (e+1)%4;
        }
        var real = 0.0;
        var imag = 0.0;
        if (e==0) real = 1.0;
        else if (e==1) imag = 1.0;
        else if (e==2) real = -1.0;
        else if (e==3) imag = -1.0;

        var logical_value = 0;
        for (j = 0; j < q.n; j++)
        {
             j5 = j>>5;
             pw = q.pw[j&31];
             if (q.x[2*q.n][j5]&pw)
                logical_value |= 1 << j;
        }
        this.qReg.pokeComplexValue(logical_value, real, imag);
    }

    this.transferCHPToLogical = function()
    {
        if (this.qReg.disableSimulation)
            return;
        this.qReg.setZero();

        q = this.qstate;
        var /*long*/ g;         // log_2 of number of nonzero basis states
        var /*unsigned long*/ t;
        var /*unsigned long*/ t2;
        var /*long*/ i;

        g = this.gaussian(q); 
        if (g > 31)
        {
             this.print("\nState is WAY too big to transfer.");
             return;
        }

        this.seed(q, g);
        this.transferBasisStateToLogical(q);
        for (t = 0; t < q.pw[g]-1; t++)
        {
            t2 = t ^ (t+1);
             for (i = 0; i < g; i++)
                     if (t2 & q.pw[i])
                             this.rowmult(q, 2*q.n, q.n + i);
             this.transferBasisStateToLogical(q);
        }
        this.qReg.renormalize(); // ej TODO: Do without this?
        this.qReg.changed();
    }
// End of class
}







