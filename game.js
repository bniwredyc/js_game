'use strict';

class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    plus(vector) {
        if (!(vector instanceof Vector)) {
            throw new Error('Можно прибавлять к вектору только вектор типа Vector');
        }
        return new Vector(this.x + vector.x, this.y + vector.y);
    }
    times(multiplier) {
        if (typeof multiplier !== 'number') {
            throw new Error('Множитель должен быть числом');
        }
        return new Vector(this.x * multiplier, this.y * multiplier);
    }
}

class Actor {
    constructor(pos = new Vector(0, 0), size = new Vector(1, 1), speed = new Vector(0, 0)) {
        if (!(pos instanceof Vector)) {
            throw new Error('Расположение должно быть типа Vector');
        }
        if (!(size instanceof Vector)) {
            throw new Error('Размер должно быть типа Vector');
        }
        if (!(speed instanceof Vector)) {
            throw new Error('Скорость должна быть типа Vector');
        }
        this.pos = pos;
        this.size = size;
        this.speed = speed;
    }
    get left() {
        return this.pos.x;
    }
    get top() {
        return this.pos.y;
    }
    get right() {
        return this.pos.x + this.size.x;
    }
    get bottom() {
        return this.pos.y + this.size.y;
    }
    get type() {
        return 'actor';
    }
    act() {}
    isIntersect(actor) {
        if (!(actor instanceof Actor)) {
            throw new Error('Объект должен быть типа Actor');
        }
        if (this === actor) {
            return false;
        }

        return this.left < actor.right && this.right > actor.left && this.top < actor.bottom && this.bottom > actor.top;
    }
}

class Level {
    constructor(grid = [], actors = []) {
        // это лишняя проверка
        actors.forEach((actor) => {
            // сравнение с undefined используется редко
            // обычно пишут просто if (actor)
            // это покрывает случай, когда переменная равна null
            if (actor === undefined) {
                // вы проверяете переменную на undefined, а не её тип
                throw new Error('Объект должен быть типа Actor');
            }
        });
        this.grid = grid;
        this.actors = actors;
        // тут можно использовать сокращённую форму записи стрелочной функции
        this.player = actors.find((actor) => {
            return actor.type === 'player';
        });
        this.height = grid.length;
        this.width = grid.reduce((maxLength, row) => row.length > maxLength ? row.length : maxLength, 0);
        this.status = null;
        this.finishDelay = 1;
    }
    isFinished() {
        return this.status !== null && this.finishDelay < 1;
    }
    actorAt(actor) {
        if (!(actor instanceof Actor)) {
            throw new Error('Объект должен быть типа Actor');
        }
        return this.actors.find((element) => actor.isIntersect(element));
    }
    obstacleAt(direction, size) {
        if (!(direction instanceof Vector)) {
            throw new Error('Направление должно быть объектом типа Vector');
        }
        if (!(size instanceof Vector)) {
            throw new Error('Размер должен быть объектом типа Vector');
        }

        // тут достаточно четырёх переменных
        // и нехватает округлений
        const topBorder = direction.y;
        const leftBorder = direction.x;
        const botBorder = direction.y + size.y;
        const rigthBorder = direction.x + size.x;
        const flooredTopBorder = Math.floor(topBorder);
        const flooredLeftBorder = Math.floor(leftBorder);
        if (botBorder >= this.grid.length) {
            return 'lava';
        }
        if (topBorder < 0 || rigthBorder >= this.width || leftBorder < 0) {
            return 'wall';
        }
        for (let y = flooredTopBorder; y < botBorder; y++) {
            for (let x = flooredLeftBorder; x < rigthBorder; x++) {
                // this.grid[y][x] лучше записать в переменную
                // чтобы 2 раза не писать
                // и !== undefined тут можно опустить
                if (this.grid[y][x] !== undefined) {
                    return this.grid[y][x]
                }
            }
        }
    }
    removeActor(actor) {
        const actorIndex = this.actors.indexOf(actor);
        if (actorIndex !== -1) {
            this.actors.splice(actorIndex, 1);
        }
    }
    noMoreActors(actorType) {
        return !this.actors.some((actor) => actor.type === actorType);
    }
    playerTouched(obstacle, actor) {
        if (this.status !== null) {
            return;
        }
        if (obstacle === 'lava' || obstacle === 'fireball') {
            this.status = 'lost';
            return;
        }
        if (obstacle === 'coin' && actor.type === 'coin') {
            this.removeActor(actor);
            if (this.noMoreActors('coin')) {
                this.status = 'won';
            }
        }
    }
}

class LevelParser {
    constructor(actorsCatalog = {}) {
        this.actorsCatalog = actorsCatalog;
    }
    actorFromSymbol(symbol) {
        // посмотрите внимательно что делает выражение в квадратных скобках
        // и осознайте его бессмысленность
        return this.actorsCatalog[Object.keys(this.actorsCatalog).find((element) => element === symbol)];
    }
    obstacleFromSymbol(symbol) {
        if (symbol === 'x') {
            return 'wall';
        }
        if (symbol === '!') {
            return 'lava';
        }
    }
    createGrid(stringArray) {
        return stringArray.map((string) => string.split('').map((symbol) => this.obstacleFromSymbol(symbol)));
    }
    createActors(stringArray) {
        return stringArray.reduce((actors, string, y) => {
            string.split('').forEach((symbol, x) => {
                const actorConstructor = this.actorFromSymbol(symbol);
                if (typeof actorConstructor === 'function') {
                    const newActor = new actorConstructor(new Vector(x, y));
                    if (newActor instanceof Actor) {
                        actors.push(newActor);
                    }
                }
            });
            return actors;
        }, []);
    }
    parse(stringArray) {
        return new Level(this.createGrid(stringArray), this.createActors(stringArray));
    }
}

class Fireball extends Actor {
    constructor(pos = new Vector(0, 0), speed = new Vector(0, 0)) {
        super(pos, new Vector(1, 1), speed);
    }
    get type() {
        return 'fireball';
    }
    getNextPosition(time = 1) {
        return this.pos.plus(this.speed.times(time));
    }
    handleObstacle() {
        this.speed = this.speed.times(-1);
    }
    act(time, level) {
        if (level.obstacleAt(this.getNextPosition(time), this.size) === undefined) {
            this.pos = this.getNextPosition(time);
        } else {
            this.handleObstacle();
        }
    }
}

class HorizontalFireball extends Fireball {
    constructor(pos) {
        super(pos, new Vector(2, 0));
    }
}

class VerticalFireball extends Fireball {
    constructor(pos) {
        super(pos, new Vector(0, 2));
    }
}

class FireRain extends Fireball {
    constructor(pos) {
        super(pos, new Vector(0, 3));
        this.startPos = pos;
    }
    handleObstacle() {
        this.pos = this.startPos;
    }
}

class Coin extends Actor {
    constructor(pos = new Vector(0, 0)) {
        super(pos.plus(new Vector(0.2, 0.1)), new Vector(0.6, 0.6));
        this.startPos = this.pos;
        this.springSpeed = 8;
        this.springDist = 0.07;
        this.spring = Math.random() * 2 * Math.PI;
    }
    get type() {
        return 'coin';
    }
    updateSpring(time = 1) {
        this.spring += this.springSpeed * time;
    }
    getSpringVector() {
        return new Vector(0, Math.sin(this.spring) * this.springDist);
    }
    getNextPosition(time) {
        this.updateSpring(time);
        return this.startPos.plus(this.getSpringVector());
    }
    act(time) {
        this.pos = this.getNextPosition(time);
    }
}

class Player extends Actor {
    constructor(pos = new Vector(0, 0)) {
        super(pos.plus(new Vector(0, -0.5)), new Vector(0.8, 1.5));
    }
    get type() {
        return 'player';
    }
}

const actorDict = {
  '@': Player,
  'o': Coin,
  '=': HorizontalFireball,
  '|': VerticalFireball,
  'v': FireRain,
};
const parser = new LevelParser(actorDict);
loadLevels()
    .then((result) => runGame(JSON.parse(result), parser, DOMDisplay)
        .then(() => alert('YOU WON')));
