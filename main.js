// main.js
import { canvas, c, cScale, cX, cY, clearCanvas, setupCanvas } from './canvas.js';
import { Fluid } from './fluid.js';

// シーン設定
var scene = {
    gravity: 0.0,	//[m/s^2]
    dt: 1.0 / 120.0,	//[t]
    numIters: 40,	
    frameNr: 0,
    obstacleX: 0.0,
    obstacleY: 0.0,
    obstacleRadius: 0.15,
    sceneNr: 0,
    showObstacle: false,
    showPressure: true,
    showSmoke: true,
    fluid: null
};

// シミュレーションセットアップ
function setupScene(sceneNr = 0) {
    scene.sceneNr = sceneNr;
    scene.obstacleRadius = 0.15;

    scene.dt = 1.0 / 60.0;
    scene.numIters = 40;

    const res = 110;
    const domainHeight = 1.0;
    const domainWidth = domainHeight / 1.1 * (canvas.width / canvas.height);
    const h = domainHeight / res;

    const numX = Math.floor(domainWidth / h);
    const numY = Math.floor(domainHeight / h);
    const density = 1000.0;

    // Fluidインスタンスを作成
    scene.fluid = new Fluid(density, numX, numY, h);

    const n = scene.fluid.numY;
    const inVel = 2.0;

    // 初期化処理
    for (let i = 0; i < scene.fluid.numX; i++) {
        for (let j = 0; j < scene.fluid.numY; j++) {
            let s = 1.0; // 流体セル
            if (i === 0 || j === 0 || j === scene.fluid.numY - 1) s = 0.0; // 壁セル
            scene.fluid.s[i * n + j] = s;

            if (i === 1) scene.fluid.u[i * n + j] = inVel;
        }
    }

    // パイプの設定
    const pipeH = 0.1 * scene.fluid.numY;
    const minJ = Math.floor(0.5 * scene.fluid.numY - 0.5 * pipeH);
    const maxJ = Math.floor(0.5 * scene.fluid.numY + 0.5 * pipeH);

    for (let j = minJ; j < maxJ; j++) {
        scene.fluid.m[j] = 0.0;
    }

    // 障害物をセット
    setObstacle(0.7, 0.5, true);

    scene.gravity = 0.0;
    scene.showPressure = true;
    scene.showSmoke = true;

    // キャンバスの初期設定
    setupCanvas();
}

// 障害物を設定する関数
function setObstacle(x, y, reset) {
    const vx = !reset ? (x - scene.obstacleX) / scene.dt : 0.0;
    const vy = !reset ? (y - scene.obstacleY) / scene.dt : 0.0;

    scene.obstacleX = x;
    scene.obstacleY = y;

    const r = scene.obstacleRadius;
    const f = scene.fluid;
    const n = f.numY;

    for (let i = 1; i < f.numX - 2; i++) {
        for (let j = 1; j < f.numY - 2; j++) {
            f.s[i * n + j] = 1.0; // 壁セル

            const dx = (i + 0.5) * f.h - x;
            const dy = (j + 0.5) * f.h - y;

            if (dx * dx + dy * dy < r * r) {
                f.s[i * n + j] = 0.0;
                f.m[i * n + j] = 1.0;
                f.u[i * n + j] = vx;
                f.u[(i + 1) * n + j] = vx;
                f.v[i * n + j] = vy;
                f.v[i * n + j + 1] = vy;
            }
        }
    }

    scene.showObstacle = true;
}

// シミュレーション処理
function simulate() {
    if (scene.fluid) {
        scene.fluid.simulate();
        scene.frameNr++;
    } else {
        console.error('Fluidインスタンスが未初期化です！');
    }
}

function getSciColor(val, minVal, maxVal) {//抜き出せる
	val = Math.min(Math.max(val, minVal), maxVal- 0.0001);
	var d = maxVal - minVal;
	val = d == 0.0 ? 0.5 : (val - minVal) / d;
	var m = 0.25;
	var num = Math.floor(val / m);
	var s = (val - num * m) / m;
	var r, g, b;

	switch (num) {
		case 0 : r = 0.0; g = s; b = 1.0; break;
		case 1 : r = 0.0; g = 1.0; b = 1.0-s; break;
		case 2 : r = s; g = 1.0; b = 0.0; break;
		case 3 : r = 1.0; g = 1.0 - s; b = 0.0; break;
	}

	return[255*r,255*g,255*b, 255]
}

// 描画処理
function draw() {
	if (scene.fluid) {
		// Fluidの状態をキャンバスに描画
		// 必要なパラメータをsceneから取得
	} else {
		console.error('Fluidインスタンスが存在しないため描画ができません！');
	}

	c.clearRect(0, 0, canvas.width, canvas.height);//今あるキャンパスを全けし

	c.fillStyle = '#FF0000';//塗りつぶし
	var f = scene.fluid;
	var n = f.numY;//fluidの縦の数 varを追加

	var cellScale = 1.1;

	var h = f.h;

	var minP = f.p[0];//varを追加
	var maxP = f.p[0];//varを追加

	for (var i = 0; i < f.numCells; i++) {
		minP = Math.min(minP, f.p[i]);
		maxP = Math.max(maxP, f.p[i]);
	}

	//var id = c.getImageData(0,0, canvas.width, canvas.height);
	var id = c.getImageData(0,0, canvas.width, canvas.height);

	var color = [255, 255, 255, 255]

	for (var i = 0; i < f.numX; i++) {
		for (var j = 0; j < f.numY; j++) {//左上から縦に

			if (scene.showPressure) {
				var p = f.p[i*n + j];
				var s = f.m[i*n + j];
				color = getSciColor(p, minP, maxP);
				//if (scene.showSmoke) {
					color[0] = Math.max(0.0, color[0] - 255*s);//sが壁なら真っ黒
					color[1] = Math.max(0.0, color[1] - 255*s);
					color[2] = Math.max(0.0, color[2] - 255*s);
				//}
			}
			else if (scene.showSmoke) {
				var s = f.m[i*n + j];
				color[0] = 255*s;
				color[1] = 255*s;
				color[2] = 255*s;
				
			}
			else if (f.s[i*n + j] == 0.0) {
				color[0] = 0;
				color[1] = 0;
				color[2] = 0;
			}

			var x = Math.floor(cX(i * h));
			var y = Math.floor(cY((j+1) * h));
			var cx = Math.floor(cScale * cellScale * h) + 1;
			var cy = Math.floor(cScale * cellScale * h) + 1;

			var r = color[0];
			var g = color[1];
			var b = color[2];

			for (var yi = y; yi < y + cy; yi++) {
				var p = 4 * (yi * canvas.width + x)

				for (var xi = 0; xi < cx; xi++) {
					id.data[p++] = r;
					id.data[p++] = g;
					id.data[p++] = b;
					id.data[p++] = 255;
				}
			}
		}
	}

	c.putImageData(id, 0, 0);
	
	
	//円中を描画　->　円の描画にすればいい
	if (scene.showObstacle) {

		//c.strokeW
		r = scene.obstacleRadius + f.h;
		if (scene.showPressure)
			c.fillStyle = '#000000';
		else
			c.fillStyle = '#DDDDDD';
		c.beginPath();	
		c.arc(
			cX(scene.obstacleX), cY(scene.obstacleY), cScale * r, 0.0, 2.0 * Math.PI); 
		c.closePath();
		c.fill();

		c.lineWidth = 3.0;
		c.strokeStyle = '#000000';
		c.beginPath();	
		c.arc(
			cX(scene.obstacleX), cY(scene.obstacleY), cScale * r, 0.0, 2.0 * Math.PI); 
		c.closePath();
		c.stroke();
		c.lineWidth = 1.0;
	}//ここまで

}

// 更新処理
function update() {
    simulate();
    draw();
    requestAnimationFrame(update);
}

// 初期化とメインループ開始
setupScene(1);
update();
