export class Fluid {
        
    constructor(density, numX, numY, h) {

        this.U_FIELD = 0;
        this.V_FIELD = 1;
        this.S_FIELD = 2;
        
        this.cnt = 0;//内部化
        this.density = density;//密度
        this.numX = numX + 2;//壁の分が2個追加される
        this.numY = numY + 2;//同上
        this.numCells = this.numX * this.numY;
        this.h = h;//[m]
        this.u = new Float32Array(this.numCells);//横の流体の速度を壁ありセルの数だけ生成
        this.v = new Float32Array(this.numCells);//縦の流体の速度
        this.newU = new Float32Array(this.numCells);
        this.newV = new Float32Array(this.numCells);
        this.p = new Float32Array(this.numCells);//パーティクル(ピンク,シアン,マゼンタ)
        this.s = new Float32Array(this.numCells);//0のときsolid、1のときfluid
        this.m = new Float32Array(this.numCells);//smokeたくかの判定
        this.newM = new Float32Array(this.numCells);
        this.m.fill(1.0)
        this.time = 0.0;
    }
    //u,pを解く, div v = 0が0になれば求回
    solveIncompressibility() { //外部依存なし、非圧縮性について解く

        //
        var numIters = 40;
        var dt = 1/120.0;
        
        var n = this.numY;
        var cp = this.density * this.h / dt;
        
        for (var iter = 0; iter < numIters; iter++) {

            for (var i = 1; i < this.numX-1; i++) {
                for (var j = 1; j < this.numY-1; j++) {

                    if (this.s[i*n + j] == 0.0)
                        continue;

                    //var s = this.s[i*n + j];
                    var sx0 = this.s[(i-1)*n + j];
                    var sx1 = this.s[(i+1)*n + j];
                    var sy0 = this.s[i*n + j-1];
                    var sy1 = this.s[i*n + j+1];
                    var s = sx0 + sx1 + sy0 + sy1;
                    if (s == 0.0)
                        continue;
                    //divは出ていく方が+
                    var div = this.u[(i+1)*n + j] - this.u[i*n + j] + 
                        this.v[i*n + j+1] - this.v[i*n + j];

                    var p = -div / s;
                    p *= 1.9;//scene.overRelaxation;
                    this.p[i*n + j] += cp * p;

                    this.u[i*n + j] -= sx0 * p;
                    this.u[(i+1)*n + j] += sx1 * p;
                    this.v[i*n + j] -= sy0 * p;
                    this.v[i*n + j+1] += sy1 * p;
                }
            }
        }

        //function sample(){
        this.time += dt
        document.getElementById("area1").innerText =  this.time;//他の言語に移植するとき外す

    }

    advectVel(dt) {

        this.newU.set(this.u);
        this.newV.set(this.v);

        var n = this.numY;
        var h = this.h;
        var h2 = 0.5 * h;

        for (var i = 1; i < this.numX; i++) {
            for (var j = 1; j < this.numY; j++) {

                this.cnt++;

                // u component
                if (this.s[i*n + j] != 0.0 && this.s[(i-1)*n + j] != 0.0 && j < this.numY - 1) {//両隣(縦)が流体なら
                    var x = i*h;
                    var y = j*h + h2;
                    var u = this.u[i*n + j];
                    var v = this.avgV(i, j);
                    //var v = this.sampleField(x,y, V_FIELD);
                    x = x - dt*u;
                    y = y - dt*v;
                    u = this.sampleField(x,y, this.U_FIELD);
                    this.newU[i*n + j] = u;
                }
                // v component
                if (this.s[i*n + j] != 0.0 && this.s[i*n + j-1] != 0.0 && i < this.numX - 1) {//両隣(横)が流体なら
                    var x = i*h + h2;
                    var y = j*h;
                    var u = this.avgU(i, j);
                    //var u = this.sampleField(x,y, U_FIELD);
                    var v = this.v[i*n + j];
                    x = x - dt*u;
                    y = y - dt*v;
                    v = this.sampleField(x,y, this.V_FIELD);
                    this.newV[i*n + j] = v;
                }
            }	 
        }

        this.u.set(this.newU);
        this.v.set(this.newV);
    }


    sampleField(x, y, field) {//外部依存なし
        var n = this.numY;
        var h = this.h;
        var h1 = 1.0 / h; //1.0
        var h2 = 0.5* h; //放出の高さが変わる0-1
        x = Math.max(Math.min(x, this.numX * h), h);
        y = Math.max(Math.min(y, this.numY * h), h);

        var dx = 0.0;
        var dy = 0.0;

        var f;

        switch (field) {
            case this.U_FIELD: f = this.u; dy = h2; break;
            case this.V_FIELD: f = this.v; dx = h2; break;
            case this.S_FIELD: f = this.m; dx = h2; dy = h2; break

        }

        var x0 = Math.min(Math.floor((x-dx)*h1), this.numX-1);
        var tx = ((x-dx) - x0*h) * h1;
        var x1 = Math.min(x0 + 1, this.numX-1);
        
        var y0 = Math.min(Math.floor((y-dy)*h1), this.numY-1);
        var ty = ((y-dy) - y0*h) * h1;
        var y1 = Math.min(y0 + 1, this.numY-1);

        var sx = 1.0 - tx;
        var sy = 1.0 - ty;

        var val = sx*sy * f[x0*n + y0] +
            tx*sy * f[x1*n + y0] +
            tx*ty * f[x1*n + y1] +
            sx*ty * f[x0*n + y1];
        
        return val;
    }

    avgU(i, j) {//外部依存なし
        var n = this.numY;
        var u = (this.u[i*n + j-1] + this.u[i*n + j] +
            this.u[(i+1)*n + j-1] + this.u[(i+1)*n + j]) * 0.25;
        return u;
            
    }

    avgV(i, j) {//外部依存なし
        var n = this.numY;
        var v = (this.v[(i-1)*n + j] + this.v[i*n + j] +
            this.v[(i-1)*n + j+1] + this.v[i*n + j+1]) * 0.25;
        return v;
    }

    

advectSmoke(dt) {

        this.newM.set(this.m);

        var n = this.numY;
        var h = this.h;
        var h2 = 0.5 * h;

        for (var i = 1; i < this.numX-1; i++) {
            for (var j = 1; j < this.numY-1; j++) {

                if (this.s[i*n + j] != 0.0) {
                    var u = (this.u[i*n + j] + this.u[(i+1)*n + j]) * 0.5;
                    var v = (this.v[i*n + j] + this.v[i*n + j+1]) * 0.5;
                    var x = i*h + h2 - dt*u;
                    var y = j*h + h2 - dt*v;

                    this.newM[i*n + j] = this.sampleField(x,y, this.S_FIELD);
                 }
            }	 
        }
        this.m.set(this.newM);
    }

    // ----------------- end of simulator ------------------------------


    simulate() {
        var dt = 1/120.0;
        this.p.fill(0.0);//ただの代入表現
        this.solveIncompressibility();

        this.advectVel(dt);
        this.advectSmoke(dt);
    }
} //classここまで