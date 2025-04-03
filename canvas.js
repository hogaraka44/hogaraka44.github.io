// canvas.js
export const canvas = document.getElementById('myCanvas');
export const c = canvas.getContext('2d');

canvas.width = window.innerWidth - 20;
canvas.height = window.innerHeight - 100;

export const cScale = canvas.height / 1.1;

export function cX(x) {
    return x * cScale;
}

export function cY(y) {
    return canvas.height - y * cScale;
}

export function clearCanvas() {
    c.clearRect(0, 0, canvas.width, canvas.height);
}

export function setupCanvas() {
    canvas.focus();
}
