// Global arrays
let nodes = [];
let particles = [];
let edges = [];

// All constants first
const NUM_NODES = 112;
const NUM_EDGES = 20;
const PARTICLE_LIFESPAN = 1500;  // Reduced from 4000
const MAX_SPEED = 1.5;      // Reduced from 2.0
const MAX_FORCE = 0.05;      // Reduced from 0.1
const EDGE_INFLUENCE_RADIUS = 25;  // Reduced to minimize cross-edge influence
const SPAWN_RATE = 0.08;  // Doubled from 0.04
const NODE_SIZE = 5;  // Reduced from 6 for less crowding
const MIN_RADIUS = 150;  // Reduced from 180
const MAX_RADIUS = 320;  // Reduced from 380
const HUB_SIZE = 40;   // Reduced from 50
const MINIHUB_SIZE = 15;  // Reduced from 20
const MINIHUB_RADIUS = 70;  // Reduced from 100
const PARTICLE_TRAIL_LENGTH = 4;  // Slightly reduced from 5
const TRAIL_ALPHA_STEP = 1.0;     // Increased from 0.8 for much faster fade-out
const TRAIL_WIDTH_START = 1.5;    // Reduced from 3.0 (half size)
const TRAIL_WIDTH_END = 0.1;      // Reduced from 0.2 (half size)
const NODE_INFLUENCE_RADIUS = 22;  // Further reduced to prevent congestion
const EDGE_LENGTH = 300;  // New constant for standardized edge influence
const INITIAL_SPEED = 1.0;     // Reduced from 1.5
const BURST_AMOUNT = 400;  // Doubled from 200
const MIN_LIFESPAN = 500;    // Reduced from 1000
const MAX_PARTICLES = 4000;  // Match pool size
const PARTICLE_POOL_SIZE = 1600;  // Doubled from 800
const POSITION_HISTORY_SIZE = 10;  // Match PARTICLE_TRAIL_LENGTH

// Adjust these constants for smoother movement
const NODE_DRIFT_SPEED = 1.6;  // Doubled from 0.8
const NODE_DRIFT_RANGE = 15;  // Reduced from 20

// Add these constants for minihub placement
const MINIHUB_MIN_RADIUS = 60;  // Reduced from 80
const MINIHUB_MAX_RADIUS = 90; // Reduced from 120

// Adjust these constants for node distribution
const SPOKE_MIN_RADIUS = 30;  // Reduced from 40
const SPOKE_MAX_RADIUS = 90;  // Reduced from 120

// Adjust these constants for less "glow"
const NODE_RAY_MULTIPLIER = 1.2;  // Reduced from 1.5
const NODE_RAY_STEPS = 3;        // Reduced from 4

// Define colors constant
const NODE_COLORS = [
  { h: 0,   s: 90, b: 100 },  // Red
  { h: 20,  s: 90, b: 100 },  // Orange-Red
  { h: 30,  s: 90, b: 100 },  // Orange
  { h: 45,  s: 90, b: 100 },  // Orange-Yellow
  { h: 60,  s: 90, b: 100 },  // Yellow
  { h: 90,  s: 90, b: 100 },  // Lime
  { h: 120, s: 90, b: 100 },  // Green
  { h: 180, s: 90, b: 100 },  // Cyan
  { h: 210, s: 90, b: 100 },  // Sky Blue
  { h: 240, s: 90, b: 100 },  // Blue
  { h: 260, s: 90, b: 100 },  // Indigo
  { h: 280, s: 90, b: 100 },  // Purple
  { h: 300, s: 90, b: 100 },  // Magenta
  { h: 330, s: 90, b: 100 }   // Pink
];

// Add this to the top of the file
let frameCount = 0;
let lastCleanupTime = 0;

// Add these constants for edge visualization
const EDGE_VISIBILITY = 0.045;  // Increased from 0.03 (1.5x more visible)
const EDGE_WEIGHT = 0.45;      // Increased from 0.3 (1.5x thicker)

// Add these constants for boundary handling
const BOUNDARY_MARGIN = 50;  // Distance from edge to apply force
const BOUNDARY_FORCE = 0.4;  // Strength of boundary force

// Add these constants for rotation
const ROTATION_SPEED = 0.0032; // Doubled from 0.0016
let rotationAngle = 0;         // Current rotation angle

// Add these constants for edge weights
const EDGE_WEIGHT_REGULAR = 1;  // Regular node-to-node connections
const EDGE_WEIGHT_TO_MINIHUB = 2;  // Edges pointing to minihubs
const EDGE_WEIGHT_TO_HUB = 4;  // Edges pointing to the hub

// Add these constants for differential rotation
const INNER_ROTATION_MULTIPLIER = 1.5; // Inner nodes rotate faster
const OUTER_ROTATION_MULTIPLIER = 0.8; // Outer nodes rotate slower
const ROTATION_TRANSITION_START = 150; // Distance where transition begins
const ROTATION_TRANSITION_END = 300;   // Distance where transition ends

// Class definitions next
class Edge {
  constructor(startNode, endNode) {
    this.startNode = startNode;
    this.endNode = endNode;
    this.direction = p5.Vector.sub(endNode.pos, startNode.pos).normalize();
    this.magnitude = EDGE_LENGTH;
    
    // Assign weight based on node types
    if (endNode.isHub) {
      this.weight = EDGE_WEIGHT_TO_HUB;
    } else if (endNode.isMinihub) {
      this.weight = EDGE_WEIGHT_TO_MINIHUB;
    } else {
      this.weight = EDGE_WEIGHT_REGULAR;
    }
  }
  
  // Add this method to display the edge
  display() {
    // Use node colors for edge gradient with reduced visibility
    let startColor = color(this.startNode.hue, this.startNode.saturation, this.startNode.brightness, EDGE_VISIBILITY);
    let endColor = color(this.endNode.hue, this.endNode.saturation, this.endNode.brightness, EDGE_VISIBILITY);
    
    // Draw a very faint line
    strokeWeight(EDGE_WEIGHT);
    stroke(lerpColor(startColor, endColor, 0.5));
    line(this.startNode.pos.x, this.startNode.pos.y, this.endNode.pos.x, this.endNode.pos.y);
  }
}

class Node {
  constructor(x, y, isHub = false, colorIndex = 0, isMinihub = false) {
    this.pos = createVector(x, y);
    this.isHub = isHub;
    this.isMinihub = isMinihub;
    this.colorIndex = colorIndex;
    this.size = isHub ? HUB_SIZE : (isMinihub ? MINIHUB_SIZE : NODE_SIZE);
    
    // Hub is white, other nodes use fixed colors
    if (isHub) {
      this.hue = 0;
      this.saturation = 0;
      this.brightness = 100;
    } else {
      let color = NODE_COLORS[colorIndex];
      this.hue = color.h;
      this.saturation = color.s;
      this.brightness = color.b;
    }
    
    this.outgoingEdges = [];
    
    // Replace noise-based movement with vector-based
    this.originalPos = createVector(x, y);
    this.driftAngle = random(TWO_PI);
    this.driftSpeed = isHub ? 0 : NODE_DRIFT_SPEED;
    this.driftAmount = 0;
    this.driftDirection = 1; // 1 for outward, -1 for inward
  }

  display() {
    // Reduce ray count based on node type
    let numRays = this.isHub ? 10 : (this.isMinihub ? 6 : 4);
    let innerLength = this.size * 0.3;  // Reduced from 0.4
    let outerLength = this.size * NODE_RAY_MULTIPLIER;
    
    // Draw two sets of rays for more density near center
    for (let i = 0; i < numRays; i++) {
      let angle = TWO_PI * i / numRays;
      
      // Inner shorter ray
      drawGradientLine(
        this.pos.x, this.pos.y,
        this.pos.x + cos(angle) * innerLength,
        this.pos.y + sin(angle) * innerLength,
        color(this.hue, this.saturation, this.brightness, 0.7),  // Reduced from 0.8
        color(this.hue, this.saturation, this.brightness, 0.3)   // Reduced from 0.4
      );
      
      // Outer longer ray
      drawGradientLine(
        this.pos.x + cos(angle) * innerLength,
        this.pos.y + sin(angle) * innerLength,
        this.pos.x + cos(angle) * outerLength,
        this.pos.y + sin(angle) * outerLength,
        color(this.hue, this.saturation, this.brightness, 0.3),  // Reduced from 0.4
        color(this.hue, this.saturation, this.brightness, 0)
      );
    }
  }

  spawnParticle() {
    if (this.outgoingEdges.length > 0 && random() < SPAWN_RATE) {
      this.createParticle();
    }
  }

  // New method to create a single particle
  createParticle() {
    particles.push(new Particle(
      this.pos.x,
      this.pos.y,
      this.hue,
      random(this.outgoingEdges)
    ));
  }

  // New method to spawn multiple particles
  burstParticles(count) {
    for (let i = 0; i < count; i++) {
      if (this.outgoingEdges.length > 0) {
        this.createParticle();
      }
    }
  }

  // Replace the update method with this smoother version
  update() {
    // Skip if hub (stays fixed)
    if (this.isHub) return;
    
    // Update drift angle with tiny increment for smooth rotation
    this.driftAngle += 0.02;
    
    // Update drift amount (distance from original position)
    this.driftAmount += 0.1 * this.driftDirection * this.driftSpeed;
    
    // Reverse direction when reaching limits
    if (this.driftAmount > NODE_DRIFT_RANGE) {
      this.driftDirection = -1;
    } else if (this.driftAmount < 0) {
      this.driftDirection = 1;
      // Change angle more when reversing at center
      this.driftAngle += random(0.2, 0.5);
    }
    
    // Calculate new position with small movement each frame
    let dx = cos(this.driftAngle) * this.driftAmount;
    let dy = sin(this.driftAngle) * this.driftAmount;
    
    // Update position
    this.pos.x = this.originalPos.x + dx;
    this.pos.y = this.originalPos.y + dy;
    
    // Update edge directions
    for (let edge of this.outgoingEdges) {
      edge.direction = p5.Vector.sub(edge.endNode.pos, this.pos).normalize();
    }
  }
}

class Particle {
  constructor(x, y, hue, edge) {
    this.pos = createVector(x, y);
    this.vel = edge.direction.copy().mult(INITIAL_SPEED);
    this.acc = createVector(0, 0);
    this.originalHue = hue;
    this.hue = hue;
    this.currentEdge = edge;
    this.lifespan = PARTICLE_LIFESPAN;
    this.alpha = 1;
    this.visitedHues = [hue];
    this.previousPositions = new Array(POSITION_HISTORY_SIZE).fill(null);
    this.currentHistoryIndex = 0;
    this.sourceHue = edge.startNode.hue;  // Store source node color
    this.targetHue = edge.endNode.hue;    // Store target node color
    this.nodesPassed = 0;  // Track number of nodes visited
    this.minLifespan = MIN_LIFESPAN; // Increased to 500 frames
    
    // Reuse vectors for calculations instead of creating new ones
    this._tempVector = createVector(0, 0);
    this._tempVector2 = createVector(0, 0);
  }

  update() {
    // Simpler trail tracking
    if (!this.trailX) {
      this.trailX = new Array(PARTICLE_TRAIL_LENGTH);
      this.trailY = new Array(PARTICLE_TRAIL_LENGTH);
      for (let i = 0; i < PARTICLE_TRAIL_LENGTH; i++) {
        this.trailX[i] = this.pos.x;
        this.trailY[i] = this.pos.y;
      }
    }
    
    // Shift trail values
    for (let i = PARTICLE_TRAIL_LENGTH - 1; i > 0; i--) {
      this.trailX[i] = this.trailX[i-1];
      this.trailY[i] = this.trailY[i-1];
    }
    this.trailX[0] = this.pos.x;
    this.trailY[0] = this.pos.y;
    
    // Update physics with damping
    this.vel.add(this.acc);
    this.vel.limit(MAX_SPEED);
    // Add slight damping to slow particles down
    this.vel.mult(0.98);
    this.pos.add(this.vel);
    this.acc.mult(0);
    
    // Add boundary checking
    this.checkBoundaries();
    
    // Decrease lifespan
    this.lifespan--;
    
    // Calculate progress along current edge
    let progressToNext = this.getEdgeProgress();
    
    // Simplified color transition
    if (this.currentEdge.endNode.isHub) {
      this.saturation = lerp(90, 0, progressToNext);
    } else if (this.currentEdge.startNode.isHub) {
      this.hue = this.targetHue;
      this.saturation = lerp(0, 90, progressToNext);
    } else {
      this.hue = lerp(this.sourceHue, this.targetHue, progressToNext);
      this.saturation = 90;
    }
    this.brightness = 100;

    // Check if reached end node and switch edges
    let distToEnd = p5.Vector.dist(this.pos, this.currentEdge.endNode.pos);
    if (distToEnd < NODE_INFLUENCE_RADIUS * 0.5) {
      let nextNode = this.currentEdge.endNode;
      this.nodesPassed++;
      
      if (this.nodesPassed >= 3) {
        this.lifespan = 0; // Kill immediately after 3 nodes
        return;
      }
      
      if (nextNode.outgoingEdges.length > 0) {
        // Get edges except those leading back
        let possibleEdges = nextNode.outgoingEdges.filter(edge => 
          edge.endNode !== this.currentEdge.startNode
        );
        
        if (possibleEdges.length === 0) {
          possibleEdges = nextNode.outgoingEdges;
        }
        
        // Use weighted random selection
        this.currentEdge = this.selectWeightedEdge(possibleEdges);
        this.sourceHue = nextNode.hue;
        this.targetHue = this.currentEdge.endNode.hue;
        
        // Smoother transition to new edge direction
        let newDir = this.currentEdge.direction.copy();
        newDir.mult(MAX_SPEED * 0.6); // Reduced speed during transitions
        this.vel.lerp(newDir, 0.4); // Gentler transition
      } else {
        this.lifespan = 0; // Kill if no outgoing edges
      }
    }
  }

  // Simplified display method
  display() {
    const alpha = map(this.lifespan, 0, PARTICLE_LIFESPAN, 0, 0.9);  // Reduced from 1.0
    
    // Draw trail segments with less glow
    for (let i = 0; i < PARTICLE_TRAIL_LENGTH - 1; i++) {
      if (this.trailX[i] && this.trailY[i] && this.trailX[i+1] && this.trailY[i+1]) {
        // Use exponential decay for alpha instead of linear
        const segmentAlpha = alpha * pow(0.4, i * 1.2);  // Faster decay (0.4 instead of 0.5)
        
        // Skip nearly invisible segments
        if (segmentAlpha > 0.03) {
          // Use exponential decay for width too (with smaller starting width)
          const segmentWidth = TRAIL_WIDTH_START * pow(0.5, i);  // Faster width decay
          
          strokeWeight(segmentWidth);
          stroke(this.hue, this.saturation, this.brightness, segmentAlpha);
          line(this.trailX[i], this.trailY[i], this.trailX[i+1], this.trailY[i+1]);
        }
      }
    }
  }

  follow() {
    // Use gentler force for edge following
    let desiredDirection = this.currentEdge.direction.copy();
    let force = desiredDirection.mult(MAX_FORCE * 0.8); // Reduced force
    
    // Add gentle correction if too far from edge
    let distFromEdge = this.distToEdge(this.currentEdge);
    if (distFromEdge > EDGE_INFLUENCE_RADIUS * 0.3) {
      let nearestPoint = this.getNearestPointOnEdge(this.currentEdge);
      let correction = p5.Vector.sub(nearestPoint, this.pos);
      correction.normalize().mult(MAX_FORCE * 0.6); // Gentler correction
      force.add(correction);
    }

    this.applyForce(force);
  }

  getNearestPointOnEdge(edge) {
    // Reuse temp vectors instead of creating new ones
    this._tempVector.set(edge.endNode.pos.x - edge.startNode.pos.x, 
                        edge.endNode.pos.y - edge.startNode.pos.y);
    this._tempVector2.set(this.pos.x - edge.startNode.pos.x, 
                         this.pos.y - edge.startNode.pos.y);
    
    let dot = this._tempVector2.dot(this._tempVector);
    let projectionLength = constrain(dot / this._tempVector.magSq(), 0, 1);
    
    return createVector(
      edge.startNode.pos.x + this._tempVector.x * projectionLength,
      edge.startNode.pos.y + this._tempVector.y * projectionLength
    );
  }

  distToEdge(edge) {
    // Calculate distance from point to line segment
    let a = p5.Vector.sub(edge.endNode.pos, edge.startNode.pos);
    let b = p5.Vector.sub(this.pos, edge.startNode.pos);
    let c = p5.Vector.sub(this.pos, edge.endNode.pos);
    
    // If point is beyond the line segment ends, return distance to nearest endpoint
    let dot = b.dot(a) / (a.mag() * a.mag());
    if (dot <= 0) return b.mag();
    if (dot >= 1) return c.mag();
    
    // Return perpendicular distance to line
    let cross = abs(a.cross(b).z);
    return cross / a.mag();
  }

  applyForce(force) {
    this.acc.add(force);
  }

  isDead() {
    return this.lifespan <= 0;
  }

  // Add this method
  getEdgeProgress() {
    let start = this.currentEdge.startNode.pos;
    let end = this.currentEdge.endNode.pos;
    let toPoint = p5.Vector.sub(this.pos, start);
    let edgeVector = p5.Vector.sub(end, start);
    
    let dot = toPoint.dot(edgeVector);
    let progress = dot / edgeVector.magSq();
    return constrain(progress, 0, 1);
  }

  // Add this new method for boundary checking
  checkBoundaries() {
    let needsCorrection = false;
    let correction = createVector(0, 0);
    
    // Check horizontal boundaries
    if (this.pos.x < BOUNDARY_MARGIN) {
      correction.x = BOUNDARY_FORCE;
      needsCorrection = true;
    } else if (this.pos.x > width - BOUNDARY_MARGIN) {
      correction.x = -BOUNDARY_FORCE;
      needsCorrection = true;
    }
    
    // Check vertical boundaries
    if (this.pos.y < BOUNDARY_MARGIN) {
      correction.y = BOUNDARY_FORCE;
      needsCorrection = true;
    } else if (this.pos.y > height - BOUNDARY_MARGIN) {
      correction.y = -BOUNDARY_FORCE;
      needsCorrection = true;
    }
    
    // Apply correction force if needed
    if (needsCorrection) {
      // If very close to edge, apply stronger correction
      if (this.pos.x < 10 || this.pos.x > width - 10 || 
          this.pos.y < 10 || this.pos.y > height - 10) {
        // Reset position to safe area
        this.pos.x = constrain(this.pos.x, 20, width - 20);
        this.pos.y = constrain(this.pos.y, 20, height - 20);
        
        // Point velocity back toward center
        this.vel = p5.Vector.sub(createVector(width/2, height/2), this.pos);
        this.vel.normalize().mult(MAX_SPEED * 0.5);
      } else {
        // Just apply correction force
        this.applyForce(correction);
      }
    }
  }

  // Add this new method for weighted edge selection
  selectWeightedEdge(edges) {
    // Calculate total weight
    let totalWeight = 0;
    for (let edge of edges) {
      totalWeight += edge.weight;
    }
    
    // Select random value within total weight
    let randomValue = random(totalWeight);
    
    // Find the edge that corresponds to this random value
    let cumulativeWeight = 0;
    for (let edge of edges) {
      cumulativeWeight += edge.weight;
      if (randomValue <= cumulativeWeight) {
        return edge;
      }
    }
    
    // Fallback (should never reach here)
    return edges[0];
  }
}

// Helper functions
function shuffleArray(array, inPlace = false) {
  let arr = inPlace ? array : [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    let j = floor(random(i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Modify drawGradientLine for less glow
function drawGradientLine(x1, y1, x2, y2, c1, c2) {
  let steps = NODE_RAY_STEPS;
  let stepSize = 1.0;  // Reduced from 1.2
  for (let i = 0; i < steps; i++) {
    let t = i / (steps - 1);
    let x = lerp(x1, x2, t);
    let y = lerp(y1, y2, t);
    let c = lerpColor(c1, c2, t);
    noStroke();
    fill(c);
    let size = stepSize * (1 - t); // Gradually reduce size
    rect(x - size/2, y - size/2, size, size);
  }
}

// p5.js functions last
function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 1);
  
  // Create central hub node
  let hubNode = new Node(width/2, height/2, true);
  nodes.push(hubNode);
  
  // Create nodes in color-based clusters with minihubs
  for (let colorIndex = 0; colorIndex < NODE_COLORS.length; colorIndex++) {
    let numNodesInCluster = floor(NUM_NODES / NODE_COLORS.length);
    let baseAngle = TWO_PI * colorIndex / NODE_COLORS.length;
    let spreadAngle = TWO_PI / NODE_COLORS.length;
    
    // Create minihub at fixed radius with even spacing
    let minihubAngle = baseAngle + spreadAngle * 0.5;
    let minihubX = width/2 + cos(minihubAngle) * MINIHUB_RADIUS;
    let minihubY = height/2 + sin(minihubAngle) * MINIHUB_RADIUS;
    let minihub = new Node(minihubX, minihubY, false, colorIndex, true);
    nodes.push(minihub);
    
    // Create regular nodes in a pattern that's closer to minihubs
    for (let i = 0; i < numNodesInCluster - 1; i++) {
      let placed = false;
      while (!placed) {
        // Blend between hub-centric and minihub-centric positioning
        let blendFactor = random(0.3, 0.7); // How much to weight toward minihub vs hub
        
        // Position nodes within color sector but biased toward minihub
        let nodeAngle = baseAngle + random(-spreadAngle * 0.4, spreadAngle * 0.4);
        
        // Distance from hub
        let hubDist = MIN_RADIUS + sqrt(random()) * (MAX_RADIUS - MIN_RADIUS);
        
        // Calculate position relative to hub
        let hubX = width/2 + cos(nodeAngle) * hubDist;
        let hubY = height/2 + sin(nodeAngle) * hubDist;
        
        // Calculate position relative to minihub
        let minihubDist = random(30, 80); // Closer to minihub
        let minihubNodeAngle = random(TWO_PI);
        let minihubX2 = minihubX + cos(minihubNodeAngle) * minihubDist;
        let minihubY2 = minihubY + sin(minihubNodeAngle) * minihubDist;
        
        // Blend the two positions
        let x = lerp(hubX, minihubX2, blendFactor);
        let y = lerp(hubY, minihubY2, blendFactor);
        
        // Check minimum distance from other nodes
        let tooClose = false;
        for (let node of nodes) {
          let d = dist(x, y, node.pos.x, node.pos.y);
          if (d < NODE_SIZE * 2.5) {
            tooClose = true;
            break;
          }
        }
        
        if (!tooClose) {
          nodes.push(new Node(x, y, false, colorIndex));
          placed = true;
        }
      }
    }
  }

  // Clear existing edges and connections
  edges = [];
  for (let node of nodes) {
    node.outgoingEdges = [];
  }

  // Get node groups
  const nonHubNodes = nodes.slice(1);
  const minihubs = nonHubNodes.filter(n => n.isMinihub);
  const regularNodes = nonHubNodes.filter(n => !n.isMinihub);

  // 1. Connect hub to all minihubs (bidirectional)
  for (let minihub of minihubs) {
    let hubToMinihub = new Edge(hubNode, minihub);
    let minihubToHub = new Edge(minihub, hubNode);
    edges.push(hubToMinihub, minihubToHub);
    hubNode.outgoingEdges.push(hubToMinihub);
    minihub.outgoingEdges.push(minihubToHub);
  }

  // 2. Connect each minihub to its color group nodes (bidirectional)
  for (let colorIndex = 0; colorIndex < NODE_COLORS.length; colorIndex++) {
    let colorMinihub = minihubs[colorIndex];
    let colorNodes = regularNodes.filter(n => n.colorIndex === colorIndex);

    // Connect all regular nodes to their minihub (bidirectional)
    for (let node of colorNodes) {
      let nodeToMinihub = new Edge(node, colorMinihub);
      let minihubToNode = new Edge(colorMinihub, node);
      edges.push(nodeToMinihub, minihubToNode);
      node.outgoingEdges.push(nodeToMinihub);
      colorMinihub.outgoingEdges.push(minihubToNode);
    }
  }

  // 3. Connect each regular node to its 4 closest neighbors in the same color group
  for (let colorIndex = 0; colorIndex < NODE_COLORS.length; colorIndex++) {
    let colorNodes = regularNodes.filter(n => n.colorIndex === colorIndex);
    
    for (let node of colorNodes) {
      // Calculate distances to other nodes in same color group
      let distances = colorNodes
        .filter(n => n !== node) // Exclude self
        .map(n => ({
          node: n,
          distance: dist(node.pos.x, node.pos.y, n.pos.x, n.pos.y)
        }))
        .sort((a, b) => a.distance - b.distance); // Sort by distance
      
      // Connect to closest nodes (up to 4)
      for (let i = 0; i < 4 && i < distances.length; i++) {
        let targetNode = distances[i].node;
        
        // Create bidirectional connection
        let edgeOut = new Edge(node, targetNode);
        let edgeIn = new Edge(targetNode, node);
        
        edges.push(edgeOut, edgeIn);
        node.outgoingEdges.push(edgeOut);
        targetNode.outgoingEdges.push(edgeIn);
      }
    }
  }
}

function draw() {
  background(0);
  frameCount++;
  
  // Update rotation angle
  rotationAngle += ROTATION_SPEED;
  
  // More aggressive cleanup
  if (frameCount % 30 === 0) {
    optimizeMemory();
  }
  
  // Save the current transformation state
  push();
  
  // Translate to center of canvas
  translate(width/2, height/2);
  
  // Apply rotation
  rotate(rotationAngle);
  
  // Translate back to origin
  translate(-width/2, -height/2);
  
  // Update nodes with differential rotation
  if (frameCount % 2 === 0) {
    for (let node of nodes) {
      // Apply differential rotation based on distance from center
      if (!node.isHub) { // Skip the hub node for rotation calculation
        // Calculate distance from center
        let dx = node.originalPos.x - width/2;
        let dy = node.originalPos.y - height/2;
        let distFromCenter = sqrt(dx*dx + dy*dy);
        
        // Calculate rotation multiplier based on distance
        let rotationMultiplier;
        if (distFromCenter < ROTATION_TRANSITION_START) {
          rotationMultiplier = INNER_ROTATION_MULTIPLIER;
        } else if (distFromCenter > ROTATION_TRANSITION_END) {
          rotationMultiplier = OUTER_ROTATION_MULTIPLIER;
        } else {
          // Smooth transition between inner and outer rotation speeds
          let t = (distFromCenter - ROTATION_TRANSITION_START) / 
                  (ROTATION_TRANSITION_END - ROTATION_TRANSITION_START);
          rotationMultiplier = lerp(INNER_ROTATION_MULTIPLIER, OUTER_ROTATION_MULTIPLIER, t);
        }
        
        // Apply rotation to original position
        let angle = atan2(dy, dx);
        let newAngle = angle + ROTATION_SPEED * rotationMultiplier;
        node.originalPos.x = width/2 + cos(newAngle) * distFromCenter;
        node.originalPos.y = height/2 + sin(newAngle) * distFromCenter;
      }
      
      // Regular update for drift
      node.update();
    }
  }
  
  // Update edges less frequently
  if (frameCount % 4 === 0) {
    for (let edge of edges) {
      edge.direction = p5.Vector.sub(edge.endNode.pos, edge.startNode.pos).normalize();
    }
  }
  
  // Draw edges first (behind nodes and particles)
  for (let edge of edges) {
    edge.display();
  }
  
  // Process particles in batches
  const maxToProcess = Math.min(particles.length, PARTICLE_POOL_SIZE);
  const batchSize = 80;
  let aliveCount = 0;
  
  for (let i = 0; i < maxToProcess; i += batchSize) {
    const end = Math.min(i + batchSize, maxToProcess);
    for (let j = i; j < end; j++) {
      const p = particles[j];
      if (p && !p.isDead()) {
        // Only follow edge every few frames
        if (frameCount % 4 === 0) {
          p.follow();
        }
        p.update();
        p.display();
        
        // Compact array in-place
        if (j !== aliveCount) {
          particles[aliveCount] = p;
        }
        aliveCount++;
      }
    }
  }
  
  // Truncate array
  particles.length = aliveCount;
  
  // Display nodes
  for (let node of nodes) {
    node.display();
  }
  
  // Restore the transformation state
  pop();
  
  // Spawn more particles each frame
  if (particles.length < PARTICLE_POOL_SIZE * 0.8) {
    const spawnCount = Math.min(20, nodes.length / 3);  // Increased from 10, nodes.length/4
    for (let i = 0; i < spawnCount; i++) {
      const randomNodeIndex = Math.floor(random(nodes.length));
      nodes[randomNodeIndex].spawnParticle();
    }
  }
}

function mousePressed() {
  // Empty function - click does nothing now
}

// Add these functions for memory management
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  cleanup();
}

function cleanup() {
  // Keep only the most recent particles
  if (particles.length > PARTICLE_POOL_SIZE / 2) {
    particles.splice(0, particles.length - PARTICLE_POOL_SIZE / 2);
  }
}

// Call cleanup when window loses focus
window.onblur = cleanup;

// Add this function for aggressive cleanup
function aggressiveCleanup() {
  // If we have too many particles, keep only the newest ones
  if (particles.length > PARTICLE_POOL_SIZE * 0.8) {
    // Sort by lifespan (higher = newer)
    particles.sort((a, b) => b.lifespan - a.lifespan);
    // Keep only the newest particles
    particles.length = Math.floor(PARTICLE_POOL_SIZE * 0.7);
  }
  
  // Force garbage collection (not directly possible in JS, but this helps)
  particles.filter(p => p !== null && p !== undefined);
}

// Optimize memory management for more particles
function optimizeMemory() {
  // Force immediate cleanup with higher threshold
  if (particles.length > PARTICLE_POOL_SIZE * 0.9) {
    console.log("Cleaning up excess particles:", particles.length - PARTICLE_POOL_SIZE);
    particles.length = Math.floor(PARTICLE_POOL_SIZE * 0.8);
  }
} 