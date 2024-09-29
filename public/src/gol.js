const config = {
  stepMs: 50,
  gridWidth: 60,
  randPctFill: 30,
  fadeOld: true,
  overPopThreshold: 3,    // DEFAULT 3 
  underPopThreshold: 2,   // DEFAULT 2 
  reproductionThreshold: 3, // DEFAULT 3
  wrap: true 
};

let grid; 
let pressed = false;
let startButton;
let intervalId;
let hashInput;
let startHash = '';
let lastInputHash = '';
let overPopInput, underPopInput, reproductionInput;

function absMod(a,b) {
  return ((a % b) + b) % b;
}

function setup() {
	createCanvas(800, 800);
	background(100);
	setupGrid();
	setupButtons();
	getGridHash();
}

function setupButtons() {
	createButton('Clear').position(10, 30).mousePressed(setupGrid);
	createButton('Step').position(130, 10).mousePressed(step);
	createButton('Random').position(60, 30).mousePressed(randomizeGrid);
	createButton('Set Hash').position(10, 50).mousePressed(setGridHash);
	createButton('Reset Hash').position(265, 50).mousePressed(resetGridHash);

	startButton = createButton('Start').position(10, 10).mousePressed(start);
	hashInput = createInput('', 'hash').position(80, 50);

	let speedInput = createInput(config.stepMs.toString(), 'number').position(60, 10);
	speedInput.input(() => {
		let value = speedInput.value();
		if (value && value > 0) config.stepMs = value;
	});

	createDiv('Grid Size:').position(10, 92).style('font-size', '15px');
	let gridWidthInput = createInput(config.gridWidth.toString(), 'number').position(72, 90);
	gridWidthInput.input(() => {
		let value = gridWidthInput.value();
		if (value && value > 0) {
			config.gridWidth = parseInt(value);
			setupGrid();
		}
	});

  let wrapCheckbox = createCheckbox('Wrap', config.wrap).position(10, 112);
	wrapCheckbox.changed(() => {
		config.wrap = wrapCheckbox.checked();
    setupGrid();
	});

	let thresholdContainer = createDiv().position(10, 200);

	createButton('Randomize Thresholds').parent(thresholdContainer).mousePressed(randomizeThresholds);

	createDiv('Overpopulation:').parent(thresholdContainer).style('font-size', '15px');
	overPopInput = createInput(config.overPopThreshold.toString(), 'number').parent(thresholdContainer);
	overPopInput.input(() => {
		let value = overPopInput.value();
		config.overPopThreshold = parseInt(value);
	});

	createDiv('Underpopulation:').parent(thresholdContainer).style('font-size', '15px');
	underPopInput = createInput(config.underPopThreshold.toString(), 'number').parent(thresholdContainer);
	underPopInput.input(() => {
		let value = underPopInput.value();
		config.underPopThreshold = parseInt(value);
	});

	createDiv('Reproduction:').parent(thresholdContainer).style('font-size', '15px');
	reproductionInput = createInput(config.reproductionThreshold.toString(), 'number').parent(thresholdContainer);
	reproductionInput.input(() => {
		let value = reproductionInput.value();
		config.reproductionThreshold = parseInt(value);
	});
}

function randomizeThresholds() {
	config.overPopThreshold = floor(random(0, 10));
	config.underPopThreshold = floor(random(0, 10));
	config.reproductionThreshold = floor(random(0, 10));

	overPopInput.value(config.overPopThreshold.toString());
	underPopInput.value(config.underPopThreshold.toString());
	reproductionInput.value(config.reproductionThreshold.toString());
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
		this.persistence = 0;
	}
	
	draw() {
		this.checkMouse();
		if (this.hover) {
			fill('green');
		} else {
			if (this.alive) {
				if (config.fadeOld) {
					// Hides all frozen structures
					// fill(255, 20*this.persistence, 20*this.persistence);
					//fill(20*this.persistence, 30*this.persistence, 60*this.persistence);

					// Frozen structures different color, cool fade to persistence
					fill(30, 30*this.persistence, 60*this.persistence);
				} else {
					fill('black');
				}
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
	resetPersistence() {
		this.persistence = 0;
	}
  addPersistence() {
		this.persistence++;
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
					if (cell.aliveNeighbors < config.underPopThreshold || cell.aliveNeighbors > config.overPopThreshold) {
						cell.nextAlive = false;
						cell.resetPersistence();
					} else {
						cell.nextAlive = true;
					}
				} else {
					// reproduction
					if (cell.aliveNeighbors === config.reproductionThreshold) {
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
				if (cell.alive) {
					cell.addPersistence();
				}
			}
		}
	}
	randomize() {
		for (let i = 0; i < this.numCells; i++) {
			for (let j = 0; j < this.numCells; j++) {
				const cell = this.cells[i][j];
				let x = random(0, 100);
				if (x <= config.randPctFill) {
					cell.alive = true;
					cell.setNeighbors(cell.alive);
				}
			}
		}
	}

	getRLEHash() {
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
		let input_split = split(new_hash, '_');
		let grid_size = input_split[0];
		let grid_hash = input_split[1];
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
	grid.getRLEHash();
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

function randomizeGrid() {
	setupGrid();
	grid.randomize();
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
		}, config.stepMs);
		startButton.html('stop');
	}
}
function setupGrid() {
	let stepSize = width / config.gridWidth;
	grid = new Grid(config.gridWidth);

	// initialize cells
	for (let i = 0; i < config.gridWidth; i++) {
		grid.cells[i] = [];
		for (let j = 0; j < config.gridWidth; j++) {
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
	for (let i = 0; i < config.gridWidth; i++) {
		for (let j = 0; j < config.gridWidth; j++) {
			let cell = grid.cells[i][j];
      if (!config.wrap) {
			  for (let k = 0; k < dirOffsets.length; k++) {
			  	const off_i = i + dirOffsets[k][0];
			  	const off_j = j + dirOffsets[k][1];

			  	if (off_i >= 0 && off_i < config.gridWidth && off_j >= 0 && off_j < config.gridWidth) {
			  		cell.neighbors[k] = grid.cells[off_i][off_j];
			  	}
			  }
      } else {
        cell.neighbors = [];
        cell.neighbors.push(grid.cells[i][absMod(j-1,config.gridWidth)]);
        cell.neighbors.push(grid.cells[i][(j+1)%config.gridWidth]);
        cell.neighbors.push(grid.cells[absMod(i-1,config.gridWidth)][j]);
        cell.neighbors.push(grid.cells[(i+1)%config.gridWidth][j]);
        cell.neighbors.push(grid.cells[absMod(i-1,config.gridWidth)][absMod(j-1,config.gridWidth)]);
        cell.neighbors.push(grid.cells[(i+1)%config.gridWidth][absMod(j-1,config.gridWidth)]);
        cell.neighbors.push(grid.cells[absMod(i-1,config.gridWidth)][(j+1)%config.gridWidth]);
        cell.neighbors.push(grid.cells[(i+1)%config.gridWidth][(j+1)%config.gridWidth]);
      }
		}
	}
	grid.hash = grid.getRLEHash();
}

function keyPressed() {
	if (key == ' ') start();
	if (keyCode == 39) step();
	if (key == 'r') randomizeGrid();
	if (key == 'e') setupGrid();
}
// TODO: should probably be refactored

function draw() {
	frameRate(60);
	grid.draw();
}
