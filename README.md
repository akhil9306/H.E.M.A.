# H.E.M.A. - Humanoid Embodiment of Multimodal AI

![Status](https://img.shields.io/badge/status-operational-green) ![License](https://img.shields.io/badge/license-MIT-blue)

An intelligent humanoid robot simulation powered by Google Gemini AI, featuring 32 articulated joints, real-time vision perception, and multi-agent factory orchestration. Experience natural language control of a sophisticated 3D robot or coordinate a fleet of 5 worker robots in an automated pipe manufacturing facility.

## Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Architecture Overview](#architecture-overview)
- [Prerequisites & Setup](#prerequisites--setup)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [Usage Guide](#usage-guide)
- [API Endpoints & Tool Calls](#api-endpoints--tool-calls)
- [Configuration Guide](#configuration-guide)
- [Troubleshooting](#troubleshooting)
- [Development Notes](#development-notes)
- [Testing Without AI](#testing-without-ai)
- [Known Limitations & Future Work](#known-limitations--future-work)
- [Deployment](#deployment)
- [License & Credits](#license--credits)

## Project Overview

H.E.M.A. (Humanoid Embodiment of Multimodal AI) is an advanced robotics simulation that combines embodied AI with natural language control. The project demonstrates how large language models can control physical systems through structured tool calls, perception through vision, and autonomous decision-making.

### Dual Operating Modes

**1. Single Robot Chat Mode**
- Interactive control of one humanoid robot via natural language
- First-person vision system for environmental awareness
- Manual joint control and pre-programmed gestures
- Object manipulation (grasping and releasing)
- Real-time 3D visualization from multiple viewpoints

**2. Factory Orchestration Mode**
- Multi-agent coordination with 5 specialized worker robots
- Automated pipe manufacturing simulation
- Hierarchical AI architecture (Orchestrator → Workers → Physical Control)
- Collision avoidance and traffic management
- Real-time progress monitoring and status display

## Key Features

- ✅ **32-DOF Humanoid Robot** - Fully articulated with realistic proportions
- ✅ **First-Person Vision System** - AI can see and reason about its environment
- ✅ **Natural Language Control** - Command robots using plain English via Gemini AI
- ✅ **Gesture System** - Wave, greet, point, and custom animations
- ✅ **Object Manipulation** - Grasp and release 7 different objects
- ✅ **Multi-Robot Orchestration** - Coordinate 5 worker robots simultaneously
- ✅ **Factory Automation** - Complete pipe manufacturing pipeline (cut, roll, press, weld)
- ✅ **Collision Avoidance** - TrafficManager prevents robot collisions
- ✅ **Real-Time 3D Rendering** - Smooth 60 FPS visualization with Three.js
- ✅ **Dual Camera System** - Third-person view + first-person robot vision
- ✅ **TypeScript Type Safety** - Full type coverage with strict mode

## Technology Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Runtime** | Bun 1.3.5+ | All-in-one JavaScript runtime with hot reload |
| **UI Framework** | React 19 | Component-based UI with hooks |
| **Language** | TypeScript | Full type safety with strict compilation |
| **3D Graphics** | Three.js 0.182.0 | WebGL-based 3D rendering engine |
| **AI/LLM** | Google Gemini API | Tool-based AI control and decision-making |
| **Build Tool** | Bun | Fast bundling and development server |

## Architecture Overview

### High-Level System Design

```
┌─────────────────────────────────────────────────────────────┐
│                      H.E.M.A. System                         │
├──────────────────────────────────────────────────────────────┤
│ React 19 Application                                         │
│                                                              │
│ ┌────────────┐  ┌──────────────────────────────────────┐   │
│ │ HomePage   │→ │ RobotPage (Mode Toggle)              │   │
│ │ (Splash)   │  │                                       │   │
│ └────────────┘  │ ┌──────────────┐  ┌────────────────┐ │   │
│                  │ │ Chat Mode    │  │ Orchestrator   │ │   │
│                  │ │ Single Robot │  │ Multi-Robot    │ │   │
│                  │ └──────────────┘  └────────────────┘ │   │
│                  └──────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
         │                          │
         ├─ RobotController         ├─ FactoryController
         │  - 32-DOF Humanoid       │  - 5 Worker Robots
         │  - Vision Camera         │  - 5 Machines
         │  - Joint Control         │  - TrafficManager
         │  - Animations            │  - Pipe Breakdown
         │                          │  - Workpiece Tracking
         │                          │
    ┌────┴─────────────────────────┴─────┐
    │   Gemini AI (Tool Call System)     │
    ├────────────────────────────────────┤
    │ Single Robot: moveJoint, grasp     │
    │ Orchestrator: dispatchWorkerTask   │
    │ Workers: walkTo, operateMachine    │
    └────────────────────────────────────┘
```

### State Management

- **RobotContext**: Provides `RobotController` instance and `useRobot()` hook
- **FactoryContext**: Provides `FactoryController` instance and `useFactory()` hook
- **React Hooks**: `useState`, `useCallback`, `useEffect` for UI state
- **Class-Based Controllers**: Three.js scene management in controller classes
- **Session Management**: Persistent AI chat sessions per endpoint

### Chat Mode Architecture

1. User sends natural language message → Chat API endpoint
2. Gemini AI analyzes message and decides which tools to call
3. Frontend receives tool calls and executes them on `RobotController`
4. Tool results (including vision images) sent back to Gemini
5. AI provides natural language response based on results
6. Loop continues until task completion

### Factory Orchestration Architecture

```
Orchestrator AI (High-Level Planner)
    ↓ dispatchWorkerTask(workerId, taskDescription)
Worker 0: Transporter ─→ Fetch/Carry/Place materials
Worker 1: Cutter ──────→ Operate guillotine cutter
Worker 2: Roller ──────→ Operate rolling machine
Worker 3: Press ───────→ Operate frustrum press
Worker 4: Welder ──────→ Operate welding station
    ↓
Physical Execution (WorkerRobot class)
    - Navigation with collision avoidance
    - Machine operation animations
    - Workpiece attachment/detachment
    - Vision-based verification
```

### 3D Scene Architecture

**Single Robot Mode:**
- Main camera: Third-person view with orbit controls
- Vision camera: First-person from robot's eye
- Robot: 32-DOF humanoid at world origin (0, 2.3, 0)
- Table: 7 graspable objects in front of robot
- Environment: Grid, fog, multi-directional lighting

**Factory Mode:**
- Wide-angle factory camera
- 6 machines along X-axis (-12 to 18)
- 5 worker robots (each assigned to a machine)
- Pipe rack with V-shaped cradles (5 slots)
- Workpiece lifecycle management
- Corridor system (Z=8) for robot travel

## Prerequisites & Setup

### System Requirements

- **Runtime**: Bun 1.3.5+ or Node.js 18+
- **Browser**: Modern browser with WebGL 2.0 support (Chrome 56+, Firefox 51+, Edge 79+, Safari 15+)
- **Disk Space**: ~200MB
- **Graphics**: GPU recommended for smooth 60 FPS rendering
- **RAM**: 4GB minimum, 8GB recommended
- **OS**: Windows, macOS, or Linux

### Verify WebGL Support

Before installation, verify your browser supports WebGL:
```bash
# Visit this URL in your browser:
https://get.webgl.org/
```

You should see a spinning cube. If not, update your browser or graphics drivers.

### Get Gemini API Key

The AI features require a free Gemini API key:

1. Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key

**Free Tier Limits:**
- gemini-1.5-flash: 15 requests/minute, 1M tokens/minute, 1500 requests/day
- gemini-1.5-pro: 2 requests/minute, 32k tokens/minute, 50 requests/day

## Installation

```bash
# Navigate to project directory
cd C:\Users\akhil\Desktop\Project_BOT\proj

# Install dependencies
bun install

# Create environment file
cp .env.example .env

# Edit .env and add your API key
# GEMINI_API_KEY=your-key-here
```

On Windows, you can manually create `.env`:
```bash
echo GEMINI_API_KEY=your-key-here > .env
```

## Running the Application

### Development Mode

**With AI Features (Recommended):**
```bash
GEMINI_API_KEY=your-key-here bun dev

# Or on Windows (if .env file exists):
bun dev
```

**Without AI (Manual Controls Only):**
```bash
bun dev
# Warning will be shown: "AI features disabled"
```

Then open your browser to: **http://localhost:3000**

### Production Build

```bash
# Build optimized bundles
bun run build

# Output directory: ./dist/

# Run production server
NODE_ENV=production bun start

# Access at: http://localhost:3000
```

### What You'll See

1. **Landing Page**: H.E.M.A. title screen with "GET STARTED" button
2. **Mode Selection**: Toggle between "Chat" (single robot) and "Orchestrator" (factory)
3. **Chat Mode**:
   - Left: 3D scene with humanoid robot
   - Right: Vision feed (robot's first-person view) + chat panel
   - Bottom: Manual controls slider panel
4. **Orchestrator Mode**:
   - Large factory scene with 5 robots and machines
   - Top: Pipe specification form
   - Right: Orchestration status and worker state
   - Bottom: Log of orchestrator decisions

## Project Structure

```
proj/
├── src/
│   ├── index.html              # Entry HTML file
│   ├── index.ts                # Bun server + API routes
│   ├── frontend.tsx            # React root mounting
│   ├── index.css               # Global styles
│   ├── App.tsx                 # State-based routing (home/robot)
│   │
│   ├── api/                    # Gemini AI Integration
│   │   ├── gemini.ts          # GeminiSession class (single robot)
│   │   ├── orchestrator.ts    # OrchestratorSession (factory planner)
│   │   └── workerAI.ts        # WorkerSession (individual worker AI)
│   │
│   ├── robot/                  # Single Robot Implementation
│   │   ├── RobotController.ts # Main controller (273 lines)
│   │   ├── createRobot.ts     # 32-DOF humanoid mesh (626 lines)
│   │   ├── createScene.ts     # Scene, lights, camera (255 lines)
│   │   ├── animations.ts      # Joint movement, gestures, walk cycle
│   │   ├── types.ts           # Joint names, limits, constants
│   │   └── index.ts           # Module exports
│   │
│   ├── factory/                # Multi-Robot Factory System
│   │   ├── FactoryController.ts    # Main orchestration engine
│   │   ├── WorkerRobot.ts          # Individual worker implementation
│   │   ├── TrafficManager.ts       # Collision avoidance system
│   │   ├── createFactoryScene.ts   # Factory environment setup
│   │   ├── factoryAnimations.ts    # Machine operation animations
│   │   ├── types.ts                # Factory types (specs, steps)
│   │   ├── pipeBreakdown.ts        # Pipe spec → manufacturing steps
│   │   ├── pipeValidator.ts        # Pipe specification validation
│   │   ├── materials.ts            # Shared material definitions
│   │   ├── helpers.ts              # Utility functions
│   │   │
│   │   └── machines/                # Individual Machine Implementations
│   │       ├── createMetalSheetStock.ts    # Raw material storage
│   │       ├── createGuillotineCutter.ts   # Sheet cutting machine
│   │       ├── createRollingMachine.ts     # 3-roller pipe bender
│   │       ├── createFrustrumPress.ts      # Conical section press
│   │       ├── createWeldingStation.ts     # Longitudinal welder
│   │       ├── createPipeRack.ts           # Finished product storage
│   │       └── index.ts                    # Machine exports
│   │
│   ├── context/                # React Context Providers
│   │   ├── RobotContext.tsx    # RobotController provider & useRobot hook
│   │   └── FactoryContext.tsx  # FactoryController provider & useFactory hook
│   │
│   ├── components/             # React UI Components
│   │   ├── ChatPanel.tsx       # Chat input + message history
│   │   ├── ChatMessage.tsx     # Individual message rendering
│   │   ├── VisionFeed.tsx      # Robot first-person camera display
│   │   ├── ModeToggle.tsx      # Chat/Orchestrator mode switcher
│   │   ├── PipeSpecForm.tsx    # Pipe specification editor
│   │   ├── SegmentEditor.tsx   # Pipe segment detail editor
│   │   └── OrchestrationStatus.tsx # Factory status display
│   │
│   └── pages/                  # Page Components
│       ├── HomePage.tsx        # Landing page
│       ├── RobotPage.tsx       # Single robot mode layout
│       └── OrchestratorView.tsx # Factory orchestration layout
│
├── .env.example               # Environment variable template
├── .env                       # Your API key (create this, gitignored)
├── .gitignore                 # Git ignore rules
├── package.json               # Dependencies and scripts
├── bun.lock                   # Bun lock file
├── bunfig.toml                # Bun configuration
├── tsconfig.json              # TypeScript configuration
└── README.md                  # This file
```

## Usage Guide

### Single Robot Mode: Chat & Manual Control

#### Natural Language Commands

```bash
# Basic movements
"Wave at me"                    # Execute wave gesture
"Look at the table"             # Tilt head down to see table
"Point to the sphere"           # Point gesture toward blue sphere

# Vision and perception
"What do you see?"              # Capture vision and describe
"Tell me about the objects"     # Analyze table objects

# Object manipulation
"Pick up the sphere"            # Look at sphere, walk closer, grasp
"Put it down"                   # Release current object
"Grab the red cube"             # Grasp specific object

# Complex actions
"Walk forward 3 steps"          # Execute walk cycle animation
"Reset to default position"     # Return all joints to neutral
```

#### Manual Controls

When AI is unavailable or you want direct control:

1. Click **"MANUAL CONTROLS"** button
2. Sliders appear for each joint:
   - Head Pan/Tilt
   - Left/Right Shoulder, Elbow, Fingers
   - Left/Right Hip, Knee
3. Adjust sliders to pose the robot
4. Use action buttons:
   - **Wave**: Friendly wave gesture
   - **Greet**: Two-handed greeting
   - **Point**: Point forward
   - **Look at Table**: Head down
   - **Reset**: Return to neutral

#### Camera Controls

- **Mouse Drag**: Rotate camera around robot
- **Mouse Wheel**: Zoom in/out
- **Right-Click Drag**: Pan camera (move viewing point)

### Factory Orchestration Mode: Automated Manufacturing

#### Defining a Pipe Specification

```typescript
// Example: Multi-segment pipe
{
  totalLength: 20,           // Total pipe length
  initialDiameter: 2.0,      // Starting diameter
  segments: [
    {
      type: "cylinder",      // Cylindrical section
      height: 5,             // Length of segment
      diameter: 2.0          // Constant diameter
    },
    {
      type: "frustrum",      // Conical transition
      height: 3,
      topDiameter: 2.0,
      bottomDiameter: 1.5
    },
    {
      type: "cylinder",
      height: 7,
      diameter: 1.5
    }
  ]
}
```

#### Manufacturing Process

1. **User submits pipe specification** via form
2. **System validates specification** against machine constraints
3. **Pipe breakdown** generates sequential manufacturing steps:
   - Fetch sheet → Cut → Roll/Press → Weld (per segment)
4. **Orchestrator AI** plans execution order
5. **Worker AIs** execute tasks autonomously:
   - **Worker 0 (Transporter)**: Fetches raw materials, carries between stations
   - **Worker 1 (Cutter)**: Cuts metal sheets to length
   - **Worker 2 (Roller)**: Rolls cylindrical sections
   - **Worker 3 (Press)**: Forms conical frustrum sections
   - **Worker 4 (Welder)**: Welds longitudinal seams
6. **Final welding**: Connect all segments circumferentially
7. **Storage**: Finished pipe placed in rack

#### Factory Layout

```
Linear Machine Arrangement (X-axis):

X=-12  X=-6    X=0     X=6      X=12       X=18
 │      │       │       │         │          │
 ▼      ▼       ▼       ▼         ▼          ▼
Sheet  Cutter  Roller  Press   Welder     Rack
Stock  ▀▀▀▀    ●●●●    ◢◣◢◣    ≈≈≈≈      ∪∪∪∪∪
       │       │       │       │         │
       └───────┴───────┴───────┴─────────┘
                Workpiece Flow

Corridor: Z=8 (robots travel here between machines)
Approach: Z=3.0-5.0 (per-worker offsets prevent collisions)
```

#### Worker Roles & Tools

| Worker | Role | Primary Tools | Machine |
|--------|------|---------------|---------|
| 0 | Transporter | walkTo, pickUp, carry, place, store | (All machines) |
| 1 | Cutter | walkToMachine, operateCutter | Guillotine Cutter |
| 2 | Roller | walkToMachine, operateRoller | Rolling Machine |
| 3 | Press | walkToMachine, operatePress | Frustrum Press |
| 4 | Welder | walkToMachine, operateWelder | Welding Station |

## API Endpoints & Tool Calls

### Server Endpoints

**1. `/api/chat` (POST)** - Single Robot Control
```typescript
Request:  { message: string, sessionId: string, toolResults?: ToolResult[] }
Response: { content: string, toolCalls?: ToolCall[] }
```

**2. `/api/orchestrator` (POST)** - Factory Orchestration
```typescript
Request:  { message: string, sessionId: string, toolResults?: ToolResult[] }
Response: { content: string, toolCalls?: ToolCall[] }
```

**3. `/api/worker` (POST)** - Individual Worker Control
```typescript
Request:  { message: string, sessionId: string, workerId: number, toolResults?: ToolResult[] }
Response: { content: string, toolCalls?: ToolCall[] }
```

### Single Robot Tools

#### moveJoint
```typescript
{
  name: "moveJoint",
  args: {
    joint: JointName,  // See table below
    angle: number      // Degrees within joint limits
  }
}
```

**Joint Reference:**

| Joint | Range | Description |
|-------|-------|-------------|
| `headPan` | -90° to 90° | Look left/right |
| `headTilt` | -60° to 60° | Look up/down |
| `leftShoulder` | -180° to 180° | Left arm rotation |
| `leftElbow` | 0° to 150° | Left arm bend |
| `leftFingers` | 0° to 90° | Left hand (0=open, 90=closed) |
| `rightShoulder` | -180° to 180° | Right arm rotation |
| `rightElbow` | 0° to 150° | Right arm bend |
| `rightFingers` | 0° to 90° | Right hand (0=open, 90=closed) |
| `leftHip` | -120° to 120° | Left leg rotation |
| `leftKnee` | 0° to 150° | Left leg bend |
| `rightHip` | -120° to 120° | Right leg rotation |
| `rightKnee` | 0° to 150° | Right leg bend |

#### executeAction
```typescript
{
  name: "executeAction",
  args: {
    action: "walk" | "stopWalk" | "wave" | "greet" |
            "point" | "lookAtTable" | "reset"
  }
}
```

#### graspObject
```typescript
{
  name: "graspObject",
  args: {
    objectName: "cube" | "sphere" | "cylinder" |
                "cone" | "cuboid" | "torus" | "octahedron"
  }
}
// Robot looks at object, closes fingers, attaches object to hand
```

#### releaseObject
```typescript
{
  name: "releaseObject",
  args: {}
}
// Opens fingers, detaches object, lets it fall
```

#### getRobotVision
```typescript
{
  name: "getRobotVision",
  args: {}
}
// Returns: { success: true, imageData: "data:image/jpeg;base64,..." }
```

### Factory Orchestrator Tools

#### dispatchWorkerTask
```typescript
{
  name: "dispatchWorkerTask",
  args: {
    workerId: 0 | 1 | 2 | 3 | 4,
    taskDescription: string,      // High-level task description
    relatedStepId?: string        // Optional step ID for tracking
  }
}
```

#### getFactoryStatus
```typescript
{
  name: "getFactoryStatus",
  args: {}
}
// Returns complete factory state: workers, machines, steps, workpieces
```

### Worker Robot Tools

#### walkToMachine
```typescript
{
  name: "walkToMachine",
  args: {
    machineId: "sheetStock" | "cutter" | "roller" |
               "press" | "welder" | "pipeRack"
  }
}
```

#### Machine-Specific Operations

**Worker 1 (Cutter):**
```typescript
{ name: "operateCutter", args: { length: number } }
```

**Worker 2 (Roller):**
```typescript
{ name: "operateRoller", args: { diameter: number, height: number } }
```

**Worker 3 (Press):**
```typescript
{ name: "operatePress", args: { topDiameter: number, bottomDiameter: number, height: number } }
```

**Worker 4 (Welder):**
```typescript
{ name: "operateWelder", args: {} }
```

**Worker 0 (Transporter) - Material Handling:**
```typescript
{ name: "pickUpSheet", args: {} }
{ name: "placeWorkpiece", args: { machineId: string } }
{ name: "pickUpFromMachine", args: { machineId: string } }
{ name: "storeInRack", args: {} }
```

## Configuration Guide

### Environment Variables

Create a `.env` file in the project root:

```bash
# Required for AI features
GEMINI_API_KEY=your-api-key-from-aistudio.google.com

# Optional: Change model (default: gemini-1.5-flash)
# GEMINI_MODEL=gemini-1.5-pro
```

### Robot Joint Limits

Defined in `src/robot/types.ts`:

```typescript
export const JOINT_LIMITS: Record<JointName, { min: number; max: number }> = {
  headPan: { min: -90, max: 90 },
  headTilt: { min: -60, max: 60 },
  leftShoulder: { min: -180, max: 180 },
  leftElbow: { min: 0, max: 150 },
  leftFingers: { min: 0, max: 90 },
  rightShoulder: { min: -180, max: 180 },
  rightElbow: { min: 0, max: 150 },
  rightFingers: { min: 0, max: 90 },
  leftHip: { min: -120, max: 120 },
  leftKnee: { min: 0, max: 150 },
  rightHip: { min: -120, max: 120 },
  rightKnee: { min: 0, max: 150 },
};
```

### Factory Machine Positions

Defined in `src/factory/types.ts`:

```typescript
export const MACHINE_POSITIONS: Record<MachineId, THREE.Vector3> = {
  sheetStock: new THREE.Vector3(-12, 0, 0),
  cutter:     new THREE.Vector3(-6, 0, 0),
  roller:     new THREE.Vector3(0, 0, 0),
  press:      new THREE.Vector3(6, 0, 0),
  welder:     new THREE.Vector3(12, 0, 0),
  pipeRack:   new THREE.Vector3(18, 0, 0),
};

export const CORRIDOR_Z = 8;  // Robot travel corridor
export const WORKER_APPROACH_Z = [3.0, 3.5, 4.0, 4.5, 5.0];  // Per-worker offsets
```

### Pipe Manufacturing Constraints

```typescript
export const PIPE_CONSTRAINTS = {
  rollerDiameterMin: 0.3,
  rollerDiameterMax: 2.0,
  rollerHeightMin: 0.5,
  rollerHeightMax: 10.0,
  frustrumTopRadiusMin: 0.2,
  frustrumTopRadiusMax: 1.0,
  frustrumBottomRadiusMin: 0.2,
  frustrumBottomRadiusMax: 1.0,
  frustrumHeightMin: 0.5,
  frustrumHeightMax: 10.0,
};
```

## Troubleshooting

### Robot Not Visible

| Symptom | Cause | Solution |
|---------|-------|----------|
| Black screen, no console logs | JavaScript error | Open DevTools (F12), check console for errors |
| "Canvas buffer size: 0 x 0" in logs | Container sizing issue | Check CSS flex layout, refresh page |
| Console shows all logs, still black | WebGL context issue | Try different browser (Chrome recommended) |
| Movement works but can't see robot | Camera position issue | Use mouse drag to rotate view |
| Vision feed works but main view black | Main renderer canvas not appended | Check console logs for "Canvas appended" |

**Step-by-Step Debug Process:**

1. **Open DevTools Console (F12)**
2. **Look for initialization logs:**
   ```
   Main renderer initialized: [width] x [height]
   Robot created and added to scene
   ✅ Robot initialized successfully
   ```
3. **Check canvas element:**
   - Right-click black area → Inspect
   - Find `<canvas>` element
   - Verify `width` and `height` attributes > 0
4. **Test interactions:**
   - Mouse drag should rotate view
   - Mouse wheel should zoom
   - "MANUAL CONTROLS" should open slider panel
5. **Verify WebGL support:**
   - Visit https://get.webgl.org/
   - Should show spinning cube
   - Update graphics drivers if necessary

### AI Features Not Working

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "API quota exceeded" | Hit free tier rate limit | Wait 30-60 seconds, space out requests |
| "API key invalid" | Wrong or missing API key | Check `.env` file, restart server (`bun dev`) |
| "No response from AI" | Server error | Check terminal logs, restart server |
| "Failed to fetch" | CORS or network issue | Check if server is running on port 3000 |

**API Quota Information:**

Free tier limits (updated 2025):

| Model | Requests/Min | Tokens/Min | Requests/Day |
|-------|--------------|------------|--------------|
| gemini-1.5-flash | 15 | 1,000,000 | 1,500 |
| gemini-1.5-pro | 2 | 32,000 | 50 |
| gemini-2.0-flash | 10 | 4,000,000 | 1,500 |

**If Hitting Quota Limits:**
- Wait the time specified in error message (usually 30-60 seconds)
- Space out requests (wait 2-3 seconds between messages)
- Upgrade to paid tier for higher limits ([Google AI Pricing](https://ai.google.dev/pricing))
- Use manual controls to test without AI
- Create new API key from different Google account

**Best Practices to Avoid Limits:**
- Send messages slowly (1-2 seconds apart)
- Use shorter, simpler prompts
- Avoid sending vision captures unnecessarily
- Don't refresh page repeatedly (creates new sessions)

### Factory Orchestration Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Robots overlapping/colliding | TrafficManager misconfiguration | Check WORKER_APPROACH_Z values in types.ts |
| Steps not executing | Pipe spec validation failed | Check console for validation errors |
| Workers stuck | AI decision loop timeout | Check worker logs, increase MAX_ITERATIONS |
| Visual glitches | Canvas not resizing | Hard refresh (Ctrl+F5), restart server |
| Workpiece disappears | Attachment logic error | Check console logs for "attach/detach" messages |

**Validate Pipe Specification:**
```typescript
import { validatePipeSpec } from '@/factory/pipeValidator';

const result = validatePipeSpec(myPipeSpec);
if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

### Performance Issues

**Symptoms:** Low FPS, stuttering, lag

**Solutions:**
1. **Reduce graphics quality:**
   - Close other browser tabs
   - Disable browser extensions
   - Lower screen resolution
2. **Check system resources:**
   - Open Task Manager (Ctrl+Shift+Esc)
   - Check CPU and GPU usage
   - Close background applications
3. **Update drivers:**
   - Update graphics card drivers
   - Update browser to latest version

## Development Notes

### Architecture Patterns

#### Controller Pattern
- `RobotController` and `FactoryController` manage Three.js scenes
- React components consume controllers via Context API
- Clean separation of 3D logic from UI rendering

#### Event System
- Controllers expose callbacks (`onStateChange`, `onMessage`)
- Components re-render when controller state updates
- Unidirectional data flow (UI → Controller → State → UI)

#### Scene Management
- Scenes created and owned by controller classes
- Canvas elements dynamically appended to React containers
- Proper cleanup on component unmount (dispose geometries, materials, renderers)

### Key Design Decisions

**1. Raw Three.js (not @react-three/fiber)**

*Rationale:*
- Direct mesh manipulation for precise robot control
- Lower overhead for real-time joint updates
- Easier integration with existing Three.js examples
- Better performance for complex animations

**2. Server-Side AI**

*Rationale:*
- Gemini API key kept secure (not exposed to frontend)
- Session management centralized on server
- Tool execution happens client-side (safe, reversible)
- Results sent back to server for next AI iteration

**3. State-Based Routing (not react-router)**

*Rationale:*
- Lightweight approach for 2-page app
- Simple `useState<"home" | "robot">` for navigation
- Avoids react-router bundle size (~100KB)
- Clearer control flow for this use case

**4. Dual AI Session Types**

*Rationale:*
- `GeminiSession`: Single robot with joint/action tools
- `OrchestratorSession`: High-level factory coordination
- `WorkerSession`: Per-worker task execution
- Allows different tool declarations per mode
- Independent conversation histories

**5. TrafficManager for Collision Avoidance**

*Rationale:*
- Centralized path reservation system
- Robots request path clearance before movement
- Automatic retry on blocked paths (exponential backoff)
- Real-time position tracking prevents overlaps
- Collision radius: 2.0 units around robots

### Performance Considerations

- **Vision Rendering**: Reduced resolution (320x240) for efficiency
- **Main Camera**: Responsive sizing, maintains aspect ratio
- **Joint Animation**: Efficient matrix updates via Three.js
- **Object Pooling**: Workpiece meshes reused in factory
- **Parallel Execution**: Workers execute tasks simultaneously (with collision avoidance)
- **Render Loop**: 60 FPS target with `requestAnimationFrame`

### Common Customizations

#### Add a New Joint

1. **Define joint in `src/robot/types.ts`:**
   ```typescript
   export type JointName = ... | "newJoint";

   export const JOINT_LIMITS: Record<JointName, { min: number; max: number }> = {
     // ...
     newJoint: { min: -90, max: 90 },
   };
   ```

2. **Create mesh in `src/robot/createRobot.ts`:**
   ```typescript
   const newJoint = createJointSphere();
   newJoint.position.set(x, y, z);
   robot.add(newJoint);
   joints.newJoint = newJoint;
   ```

3. **Add animation in `src/robot/animations.ts`:**
   ```typescript
   export function setJointAngle(robot: RobotMesh, joint: JointName, angle: number) {
     // ...
     if (joint === "newJoint") {
       joints.newJoint.rotation.x = THREE.MathUtils.degToRad(angle);
     }
   }
   ```

4. **Update tool declaration in `src/api/gemini.ts`:**
   ```typescript
   // Add to moveJoint tool schema
   ```

#### Add a New Machine

1. **Create file `src/factory/machines/createMyMachine.ts`:**
   ```typescript
   export function createMyMachine(): THREE.Group {
     const machine = new THREE.Group();
     // Add meshes...
     return machine;
   }
   ```

2. **Export from `src/factory/machines/index.ts`:**
   ```typescript
   export { createMyMachine } from './createMyMachine';
   ```

3. **Add to `src/factory/types.ts`:**
   ```typescript
   export type MachineId = ... | "myMachine";

   export const MACHINE_POSITIONS: Record<MachineId, THREE.Vector3> = {
     // ...
     myMachine: new THREE.Vector3(x, 0, z),
   };
   ```

4. **Update factory scene creation in `src/factory/createFactoryScene.ts`:**
   ```typescript
   import { createMyMachine } from './machines';

   const myMachine = createMyMachine();
   myMachine.position.copy(MACHINE_POSITIONS.myMachine);
   scene.add(myMachine);
   ```

#### Change Factory Layout

Modify positions in `src/factory/types.ts`:

```typescript
export const MACHINE_POSITIONS: Record<MachineId, THREE.Vector3> = {
  sheetStock: new THREE.Vector3(-15, 0, 0),  // Changed from -12
  cutter:     new THREE.Vector3(-8, 0, 0),   // Changed from -6
  // ... etc
};

export const CORRIDOR_Z = 10;  // Changed from 8
export const WORKER_APPROACH_Z = [4.0, 4.5, 5.0, 5.5, 6.0];  // Adjusted
```

## Testing Without AI

You can fully test the robot without a Gemini API key:

```bash
# Start server without API key
bun dev

# Access at: http://localhost:3000
# Warning will show: "AI features are unavailable"
```

**Manual Testing:**
1. Click **"MANUAL CONTROLS"** button
2. Adjust joint sliders (12 joints available)
3. Click action buttons:
   - **Wave**: Arm wave gesture
   - **Greet**: Two-handed greeting
   - **Point**: Point forward
   - **Look at Table**: Head tilt down
   - **Reset**: Return to neutral pose
4. Use mouse to rotate camera around robot
5. All visual features work without AI

This is useful for:
- Testing robot mesh and animations
- Verifying Three.js rendering
- Developing new gestures
- Debugging visual issues
- Working offline

## Known Limitations & Future Work

### Current Limitations

- Single canvas per scene (no multi-viewport rendering)
- Vision feed lower resolution (320x240) than main view
- Factory uses fixed machine layout (no dynamic reconfiguration)
- No physics simulation (kinematic movement only, no gravity/collisions with objects)
- TrafficManager uses simple radius-based collision detection
- AI token limits on free tier (15 requests/minute for gemini-1.5-flash)
- No persistent storage (factory state resets on page refresh)
- Browser-based only (no native desktop app)

### Planned Enhancements

**Short-term:**
- Custom factory layouts via UI configuration
- Adjustable vision feed resolution
- Persistent workpiece database (IndexedDB or server-side)
- More sophisticated path planning (A* algorithm)
- Additional machine types (lathe, mill, grinder)

**Long-term:**
- Physics integration with Rapier or Cannon.js
- Multi-robot communication protocol
- VR support for immersive control
- Real-time collaboration (multiple users)
- Mobile app (React Native port)
- Integration with real robotics hardware (ROS bridge)
- Advanced AI: multi-modal learning, adaptive task planning

## Deployment

### Local Development

```bash
# Hot reload enabled
bun dev

# Access at: http://localhost:3000
```

### Production Build

```bash
# Build optimized bundles
bun run build

# Output: ./dist/ directory

# Serve production build
NODE_ENV=production bun start
```

### Docker Deployment (Optional)

Create `Dockerfile`:

```dockerfile
FROM oven/bun:latest

WORKDIR /app

# Copy dependency files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install

# Copy source code
COPY . .

# Set environment variable
ENV GEMINI_API_KEY=your-key-here

# Expose port
EXPOSE 3000

# Start server
CMD ["bun", "start"]
```

Build and run:

```bash
# Build image
docker build -t hema .

# Run container
docker run -p 3000:3000 -e GEMINI_API_KEY=your-key hema

# Access at: http://localhost:3000
```

### Cloud Deployment

**Recommended Platforms:**
- **Vercel**: Automatic deployments from Git
- **Railway**: Simple container deployment
- **Render**: Free tier available
- **Fly.io**: Global edge deployment

**Environment Variables:**
- Set `GEMINI_API_KEY` in platform dashboard
- Ensure `bun` is supported or use Node.js compatibility

## License & Credits

### Project Information

- **Project Name**: H.E.M.A. (Humanoid Embodiment of Multimodal AI)
- **License**: MIT License
- **Repository**: https://github.com/yourusername/hema (update with actual URL)

### Technologies Used

- **[Bun](https://bun.com)** - All-in-one JavaScript runtime
- **[React 19](https://react.dev)** - UI framework
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Three.js](https://threejs.org)** - 3D graphics library
- **[Google Gemini AI](https://ai.google.dev)** - Large language model

### Acknowledgments

- Three.js community for excellent documentation
- Google for providing free Gemini API tier
- Bun team for blazing-fast JavaScript runtime

## Support & Resources

### Getting Help

If you encounter issues:

1. Check this README's [Troubleshooting](#troubleshooting) section
2. Review browser console logs (F12)
3. Verify WebGL support: https://get.webgl.org/
4. Check API quota: https://aistudio.google.com/

### Useful Links

**Documentation:**
- [Gemini API Docs](https://ai.google.dev/docs)
- [Three.js Documentation](https://threejs.org/docs/)
- [Bun Documentation](https://bun.sh/docs)
- [React 19 Docs](https://react.dev)

**Tools:**
- [WebGL Support Check](https://get.webgl.org/)
- [Google AI Studio](https://aistudio.google.com/apikey) - Get API key
- [Google Cloud Console](https://console.cloud.google.com/) - Monitor usage

**Community:**
- [Three.js Forum](https://discourse.threejs.org/)
- [Bun Discord](https://bun.sh/discord)
- [Google AI Forum](https://discuss.ai.google.dev/)

### API Monitoring

**Check your usage:**
- Free tier quota: https://aistudio.google.com/
- Paid tier dashboard: https://console.cloud.google.com/

**Rate Limits:**
- Current limits shown in error messages
- Dashboard shows requests/minute and daily totals

---

**Built with ❤️ using Bun, React, Three.js, and Google Gemini AI**

For questions, issues, or contributions, please open an issue on GitHub.
