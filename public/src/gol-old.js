let stepMs = 50;
let numCells = 60;
let randPctFill = 30;

let grid;
let pressed = false;
let startButton;
let intervalId;
let wrap = 0;
let hashInput;
let startHash = '';
let lastInputHash = '';

function setup() {
	createCanvas(800, 800);
	background(100);
	setupGrid();
	setupButtons();
	getGridHash();
}

function keyPressed() {
	if (key == ' ') {
		start();
	}
	if (keyCode == 39) {
		step();
	}
	if (key == 'r') {
		randgrid();
	}
	if (key == 'e') {
		setupGrid();
	}
}

function setupButtons() {
	let clearButton = createButton('clear');
	let stepButton = createButton('step');
	let randButton = createButton('random');
	let setHashButton = createButton('set hash');
	hashInput = createInput(startHash, 'hash');
	let resetHashButton = createButton('reset');
	let speedInput = createInput(stepMs.toString(), 'number');
	startButton = createButton('start');

	// x y
	startButton.position(10, 10);
	speedInput.position(60, 10);
	stepButton.position(130, 10);
	
	clearButton.position(10, 30);
	randButton.position(60, 30);

	setHashButton.position(10, 50);
	hashInput.position(80, 50);
	resetHashButton.position(265, 50);
	

	
	clearButton.mousePressed(setupGrid);
	stepButton.mousePressed(step);
	startButton.mousePressed(start);
	setHashButton.mousePressed(setGridHash);
	resetHashButton.mousePressed(resetGridHash);
	randButton.mousePressed(randgrid);
	
	speedInput.input(() => {
		let value = parseInt(speedInput.value());
		if (value && value > 0) {
			stepMs = value;
		}
  });
}

class Cell {
	constructor(x, y, size) {
		this.x = x;
		this.y = y;
		this.xIdx = floor(x/size);
		this.yIdx = floor(y/size);
		this.size = size;
		this.alive = false;
		this.hover = false;
		this.neighbors = [];
		this.aliveNeighbors = 0;
		this.nextAlive = false;
	}
	
	draw() {
		this.checkMouse();
		if (this.hover) {
			fill('green');
		} else {
			if (this.alive) {
				fill('black');
			} else {
				fill('white');			
			}
		}
		square(this.x, this.y, this.size);	
	}

	checkMouse() {
		if ((mouseX >= (this.x/this.size)*this.size) &&
				(mouseX <= ((this.x/this.size)+1)*this.size) &&
				(mouseY >= (this.y/this.size)*this.size) &&
				(mouseY <= ((this.y/this.size)+1)*this.size)) {
			this.hover = true;
			if ((pressed === false) && (mouseIsPressed === true)) {
				pressed = true;
				if (this.alive) {
					this.alive = false;
					this.setNeighbors(false);
				} else {
					this.alive = true;
					this.setNeighbors(true);
				}
				getGridHash();
			} else if ((pressed === true) && (mouseIsPressed === false)) {
				pressed = false;
			}
		} else {
			this.hover = false;
		}
	}
	setNeighbors(alive) {
		if (alive) {
			for(let i = 0; i < 8; i++) {
				if (this.neighbors[i] != null) {
					this.neighbors[i].aliveNeighbors++;
				}
			}
		} else {
			for(let i = 0; i < 8; i++) {
				if (this.neighbors[i] != null) {
					this.neighbors[i].aliveNeighbors--;
				}
			}
		}
	}
}

class Grid {
	constructor(numCells) {
		this.cells = [];
		this.numCells = numCells;
	}
	draw() {
		for (let i = 0; i < this.numCells; i++) {
			for (let j = 0; j < this.numCells; j++) {
				grid.cells[i][j].draw();
			}
		}
	}
	step() {
		// compute next state
		for (let i = 0; i < this.numCells; i++) {
			for (let j = 0; j < this.numCells; j++) {
				const cell = this.cells[i][j];
				if (cell.alive) {
					// under/overpopulation
					if (cell.aliveNeighbors < 2 || cell.aliveNeighbors > 3) {
						cell.nextAlive = false;
					} else {
						cell.nextAlive = true;
					}
				} else {
					// reproduction
					if (cell.aliveNeighbors === 3) {
						cell.nextAlive = true;
					} else {
						cell.nextAlive = false;
					}
				}
			}
		}

		// update states + neighbors
		for (let i = 0; i < this.numCells; i++) {
			for (let j = 0; j < this.numCells; j++) {
				const cell = this.cells[i][j];
				if (cell.alive !== cell.nextAlive) {
					cell.alive = cell.nextAlive;
					cell.setNeighbors(cell.alive);
				}
			}
		}
	}
	rand() {
		for (let i = 0; i < this.numCells; i++) {
			for (let j = 0; j < this.numCells; j++) {
				const cell = this.cells[i][j];
				let x = random(0, 100);
				if (x <= randPctFill) {
					cell.alive = true;
					cell.setNeighbors(cell.alive);
				}
			}
		}
	}

	getHash() {
		let hash = [];
		let pre_rle = [];
		let totalCells = this.numCells*this.numCells;
		append(hash, this.numCells);
		append(hash, '_');
		
		for (let i = 0; i < this.numCells; i++) {
			for (let j = 0; j < this.numCells; j++) {
				/*
					If first is 'a', we can assume next is 'd', and 
					continue alternating.
					However the current way will allow different states/colors
				*/
				if (grid.cells[i][j].alive) {
					append(pre_rle, 'a');
				} else {
					append(pre_rle, 'd');
				}
			}
		}
		for (let i = 0; i < totalCells; i++) {
				let count = 1;
				while ((i < totalCells) && (pre_rle[i] == pre_rle[i+1])) {
					count++;
					i++;
				}
				append(hash, pre_rle[i]);
				append(hash, count);
				append(hash,'-');
			}
		hash.pop();
		this.hash = join(hash, '');
	}
	
	setHash(new_hash) {
		let total_cells = this.numCells*this.numCells;
		let input_split = split(new_hash, '_');
		let grid_size = input_split[0];
		let grid_hash = input_split[1];
		let grid_array = new Array(total_cells).fill(null);
		let state;
		let idx = 0;
		
		if (grid_size != this.numCells) {
			print('Bad hash! Wrong board size!');
			return;
		}
		
		let hash_split = split(grid_hash, '-');
		
		for (let i = 0; i < hash_split.length; i++) {
			let status = false;
			let cell_split = split(hash_split[i].toString(), hash_split[i][0]);
			let cell_count = cell_split[1];
			let count = 0;
			
			if (hash_split[i][0] == 'a') {
				status = true;
			} else if (hash_split[i][0] == 'd') {
				status = false;
			} else {
				error.log('Broken hash!');
				exit();
			}
			
			for (let count = 0; count < cell_count; count++) {
				let x = idx % this.numCells;
				let y = floor(idx / this.numCells); 
				if (status) {
					this.cells[y][x].alive = status;
					this.cells[y][x].setNeighbors(this.cells[y][x].alive);
				}
				idx++;
			}
		}
	}
}

function getGridHash() {
	grid.getHash();
	hashInput.value(grid.hash);
	// print(grid.hash)
}

function setGridHash() {
	let value = hashInput.value().toString();
	if (value != grid.hash) {
		setupGrid();
		grid.setHash(value);
		grid.draw();
		lastInputHash = value;		
	}
}

function resetGridHash() {
	if (lastInputHash != grid.hash) {
		setupGrid();
		grid.setHash(lastInputHash);
		grid.draw();
	}
}

function step() {
	grid.step();
	grid.draw();
	getGridHash();
}

function randgrid() {
	setupGrid();
	grid.rand();
	grid.draw();		
	getGridHash();
}

function start() {
	if (intervalId) {
		clearInterval(intervalId);
		intervalId = null;
		startButton.html('start');
	} else {
		intervalId = setInterval(() => {
			step();
		}, stepMs);
		startButton.html('stop');
	}
}
function setupGrid() {
	let stepSize = width / numCells;
	grid = new Grid(numCells);

	// initialize cells
	for (let i = 0; i < numCells; i++) {
		grid.cells[i] = [];
		for (let j = 0; j < numCells; j++) {
			let x = i * stepSize;
			let y = j * stepSize;
			let cell = new Cell(x, y, stepSize);
			grid.cells[i][j] = cell;
			cell.neighbors = new Array(8).fill(null);
		}
	}

	const dirOffsets = [
		[-1, -1],
		[-1, 0],
		[-1, 1],
		[0, -1],
		[0, 1],
		[1, -1],
		[1, 0],
		[1, 1]
	];

	// assign neighbors
	if (!wrap) {
		for (let i = 0; i < numCells; i++) {
			for (let j = 0; j < numCells; j++) {
				let cell = grid.cells[i][j];
				for (let k = 0; k < dirOffsets.length; k++) {
					const off_i = i + dirOffsets[k][0];
					const off_j = j + dirOffsets[k][1];

					if (off_i >= 0 && off_i < numCells && off_j >= 0 && off_j < numCells) {
						cell.neighbors[k] = grid.cells[off_i][off_j];
					}
				}
			}
		}
	}
	grid.hash = grid.getHash();
}

// TODO: should probably be refactored

function draw() {
	frameRate(60);
	grid.draw();
}
