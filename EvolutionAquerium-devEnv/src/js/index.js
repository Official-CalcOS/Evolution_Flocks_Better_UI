// Global variables
const canvas = document.querySelector('#c');
let WIDTH = canvas.width = window.innerWidth;
let HEIGHT = canvas.height = window.innerHeight;
const ctx = canvas.getContext('2d');

// Resize canvas on window resize
window.onresize = function() {
  const canvas = document.querySelector('#c');
  WIDTH = canvas.width = window.innerWidth;
  HEIGHT = canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
};

// Default values for maximum number of creatures and reproduction rate
let MAX_CREATURES = 300;
let REPRODUCTION_RATE = 0.5;

// Update MAX_CREATURES when input value changes
const maxCreaturesInput = document.getElementById('max-creatures');
maxCreaturesInput.addEventListener('input', () => {
  MAX_CREATURES = parseInt(maxCreaturesInput.value);
});

// Update REPRODUCTION_RATE when input value changes
const mateRateInput = document.getElementById('mate-rate');
mateRateInput.addEventListener('input', () => {
  REPRODUCTION_RATE = parseInt(mateRateInput.value);
});

const ENABLE_SUPER_DEBUG = false;

// Constants for flexibility
const CREATURE = 'CREATURE';
const PREDATOR = 'PREDATOR';
const AVOIDER = 'AVOIDER';
const EATER = 'EATER';
const FOOD = 'FOOD';
const POISON = 'POISON';
const ALPHA_CREATURE = 'ALPHA_CREATURE';

// Initialize the ecosystem
function load() {
  if (typeof window.orientation !== 'undefined') {
    MAX_CREATURES = 200;
  }

  const ecoSys = new EcoSystem();

  // Create arrays for entities
  ecoSys.addEntities({
    FOOD: [],
    POISON: []
  });

  // Register agent classes and create corresponding arrays
  ecoSys.registerAgents({
    CREATURE: Agent,
    PREDATOR: Predator,
    AVOIDER: Avoider,
    EATER: Eater,
    ALPHA_CREATURE: AlphaCreature,
  });

  // Set initial population for each agent type
  ecoSys.initialPopulation({
    CREATURE: 150,
    PREDATOR: randomInt(5, 10),
    AVOIDER: randomInt(10, 20),
    EATER: randomInt(1, 4),
    ALPHA_CREATURE: 0,
  });

  let debugAgent = null;
  if (ENABLE_SUPER_DEBUG) {
    // Enable debug mode on mouse click
    canvas.addEventListener('mousedown', function (e) {
      for (let i = 0; i < ecoSys.groups.CREATURE.length; i++) {
        let a = ecoSys.groups.CREATURE[i];
        if (dist(e.offsetX, e.offsetY, a.pos.x, a.pos.y) < a.radius * 2) {
          debugAgent = a;
        }
      }
    });
  }

  let add = document.getElementById('addnew');
  canvas.addEventListener('click', function (e) {
    ecoSys.add(add.value, e.offsetX, e.offsetY);
  });

  function populationConstraints() {
    // Add and reset entities based on population constraints
    if (random(1) < 0.03) addItem(ecoSys.entities.FOOD, 8);
    if (random(1) < 0.03) addItem(ecoSys.entities.POISON, 1);

    if (random(1) < 0.005) addPredators(ecoSys.groups.PREDATOR, 1);
    if (random(1) < 0.005) addAvoiders(ecoSys.groups.AVOIDER, 1);

    if (ecoSys.groups.CREATURE.length < 20) {
      addCreatures(ecoSys.groups.CREATURE, 10);
    }
    if (ecoSys.groups.EATER.length < 1) {
      addEaters(ecoSys.groups.EATER, 1);
    }
    if (ecoSys.entities.FOOD.length < 50) {
      addItem(ecoSys.entities.FOOD, 20);
    }
    if (ecoSys.groups.CREATURE.length > MAX_CREATURES) {
      ecoSys.groups.CREATURE.pop();
    }
  }

  let lastframe;
  let fps;

  // Animation loop
  function animate() {
    ctx.fillStyle = '#252525';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);


    ecoSys.addBehavior({
      name: ALPHA_CREATURE,
      like: POISON,
      dislike: POISON,
      likeDislikeWeight: [1, 1],
      fear: {
        CREATURE: [1.0, 100, function (list, i) {
          list.splice(i, 1);
          this.health += this.goodFoodMultiplier;
          this.radius += this.goodFoodMultiplier;
        }],
        PREDATOR: [1.0, 100, function (list, i) {
          list.splice(i, 1);
          this.health += this.goodFoodMultiplier;
          this.radius += this.goodFoodMultiplier;
        }],
        AVOIDER: [1.0, 100, function (list, i) {
          list.splice(i, 1);
          this.health += this.goodFoodMultiplier;
          this.radius += this.goodFoodMultiplier;
        }],
        EATER: [10.0, 100, function (list, i) {
          list.splice(i, 1);
          this.health += this.goodFoodMultiplier;
          this.radius += this.goodFoodMultiplier;
        }],
      },
    });
    


    // Add behaviors to the ecosystem
    ecoSys.addBehavior({
      name: CREATURE,
      like: FOOD,
      dislike: POISON,
      fear: {
        PREDATOR: [-4, 75],
        EATER: [-2, 100],
        ALPHA_CREATURE: [-10, 100]
      },
      cloneItSelf: 0.0001,
      callback: function () {
        if (ecoSys.groups.CREATURE.length < MAX_CREATURES &&
            random(1) < REPRODUCTION_RATE) {
          this.reproduce(ecoSys.groups.CREATURE);
        }
      }
    });

    ecoSys.addBehavior({
      name: PREDATOR,
      like: POISON,
      dislike: FOOD,
      likeDislikeWeight: [1, -1],
      fear: {
        EATER: [-10, 50],
        CREATURE: [1, 200],
        ALPHA_CREATURE: [-10, 100, function (agents, i) {
          agents.splice(i, 1);
          this.health += this.goodFoodMultiplier;
          this.radius += this.goodFoodMultiplier;
        }]
      },
    });

    ecoSys.addBehavior({
      name: AVOIDER,
      like: FOOD,
      dislike: POISON,
      cloneItSelf: 0.0005,
      fear: {
        CREATURE: [-0.9, 100],
        EATER: [-1, 100],
        PREDATOR: [-1, 100],
        ALPHA_CREATURE: [-10, 100, function () {
          this.health += this.badFoodMultiplier;
        }]
      },
    });

    ecoSys.addBehavior({
      name: EATER,
      like: POISON,
      dislike: POISON,
      likeDislikeWeight: [1, 1],
      fear: {
        ALPHA_CREATURE: [-10, 100,],
        CREATURE: [1.0, 100, function (list, i) {
          list.splice(i, 1);
          this.health += this.goodFoodMultiplier;
          this.radius += this.goodFoodMultiplier;
        }],
        PREDATOR: [1.0, 100, function (list, i) {
          list.splice(i, 1);
          this.health += this.goodFoodMultiplier;
          this.radius += this.goodFoodMultiplier;
        }],
        AVOIDER: [1.0, 100, function (list, i) {
          list.splice(i, 1);
          this.health += this.goodFoodMultiplier;
          this.radius += this.goodFoodMultiplier;
        }],
      },
      callback: function () {
        if (random(0, 1) < 0.05) {
          addItem(ecoSys.entities.FOOD, 1, this.pos.x, this.pos.y);
        }
      }
    });

    // Update and render entities
    ecoSys.render();
    ecoSys.update();
    renderItem(ecoSys.entities.FOOD, 'white', 1, true);
    renderItem(ecoSys.entities.POISON, 'crimson', 2);

    populationConstraints();

    if (debugAgent && ENABLE_SUPER_DEBUG) {
      debugAgent.renderHealth(ctx);
      debugAgent.renderDebugDNA(ctx);
      debugAgent.renderDebug(ctx);
    }

    requestAnimationFrame(animate);

    if (!lastframe) {
      lastframe = Date.now();
      fps = 0;
      return;
    }
    delta = (Date.now() - lastframe) / 1000;
    lastframe = Date.now();
    fps = (1 / delta).toFixed(2);
  }

  animate();

  // Stats
  window.setInterval(function () {
    renderStats({
      'Entities': ecoSys.groups.CREATURE.length + ecoSys.groups.PREDATOR.length + ecoSys.groups.AVOIDER.length + ecoSys.groups.EATER.length + ecoSys.entities.FOOD.length + ecoSys.entities.POISON.length + ecoSys.groups.ALPHA_CREATURE.length,
      'Boids': ecoSys.groups.CREATURE.length + ecoSys.groups.PREDATOR.length + ecoSys.groups.AVOIDER.length + ecoSys.groups.EATER.length + ecoSys.groups.ALPHA_CREATURE.length,
      'Foods': ecoSys.entities.FOOD.length + ecoSys.entities.POISON.length,
      'FPS': fps + ' |',
    });
  });
}

window.onload = load;
