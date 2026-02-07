# Debug Checklist for Robot Visibility Issue

## What I Just Fixed (Round 2)

Based on your screenshot showing the vision feed works but main view is black, I've applied these fixes:

### 1. Canvas Styling & Positioning
**File**: `src/robot/createScene.ts`
- ✅ Set canvas to `position: absolute` with explicit positioning
- ✅ Added `alpha: false` to renderer options
- ✅ Set both buffer size AND CSS size with `setSize(width, height, true)`
- ✅ Added comprehensive logging for canvas dimensions

### 2. Container Positioning
**File**: `src/pages/RobotPage.tsx`
- ✅ Set `sceneContainer` to `position: relative`
- ✅ Added `overflow: hidden` to prevent layout issues

### 3. Visual Test
**File**: `src/robot/createScene.ts`
- ✅ Changed background from pure black (0x0a0a0a) to dark blue (0x0a1a2e)
- ✅ Added bright debug light at camera position
- ✅ Added pixel ratio setting for HiDPI displays

### 4. Enhanced Logging
Added console logs to track:
- Canvas buffer size vs CSS size
- Container dimensions
- Render loop execution (every 60 frames)
- Robot creation and visibility
- Camera position and scene children count

## How to Test

1. **Restart the dev server:**
   ```bash
   cd C:\Users\akhil\Desktop\Project_BOT\proj
   bun dev
   ```

2. **Open browser to** `http://localhost:3000/`

3. **Open DevTools Console (F12)** and look for these logs:

```
Main renderer initialized: [width] x [height]
  - Canvas buffer size: [w] x [h]
  - Container size: [w] x [h]
  - Canvas appended to container

Robot created and added to scene:
  - Robot position: Vector3 {x: 0, y: 0, z: 0}
  - Robot children count: 1
  - Torso position: ...
  - Head position: ...
  - Scene children count: [number]

✅ Robot initialized successfully
  - Robot position: Vector3 {x: 0, y: 0, z: 0}
  - Camera position: Vector3 {x: -4, y: 3, z: 6}
  - Container dimensions: [w] x [h]

Render frame 60:
  - Canvas size: [w] x [h]
  - Camera position: ...
  - Scene children: [number]
  - Robot visible: true
```

## What to Look For

### Expected Visual Changes:
1. **Background color**: Should be dark blue-ish instead of pure black
2. **Main scene**: Should show the robot, grid, and table
3. **Vision feed**: Should still show table objects (as before)

### If Still Black:

**Check Console Logs:**
1. Are there ANY console logs appearing?
2. What's the "Canvas buffer size"?
3. What's the "Container size"?
4. Is "Robot visible" true or false?
5. Are there any JavaScript errors?

**Check Canvas Element:**
1. Right-click in the black area → Inspect
2. Find the `<canvas>` element
3. Check its computed dimensions in DevTools
4. Check if it has `width` and `height` attributes > 0
5. Check its CSS styles

**Common Issues:**

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| No console logs at all | JavaScript error preventing init | Check console for errors |
| "Canvas buffer size: 0 x 0" | Container has no dimensions | Check CSS flex layout |
| "Container size: 0 x 0" | Parent flex not working | Check page styles |
| Logs show correct sizes but still black | WebGL context issue | Try different browser |
| Background still pure black | Caching issue | Hard refresh (Ctrl+F5) |

## Test Interactions

If you see any change from pure black:
1. **Mouse drag** - Should rotate camera around robot
2. **Mouse wheel** - Should zoom in/out
3. **Click "MANUAL CONTROLS"** - Open joint control panel
4. **Move any slider** - Robot should animate

## Next Steps if Still Not Visible

If after all these changes the main view is still black, please share:

1. **Full console output** (copy all logs)
2. **Canvas element inspection**:
   - Right-click black area → Inspect
   - Copy the `<canvas>` element HTML
   - Copy computed CSS styles
3. **Browser and OS info**
4. **Any JavaScript errors in console**

I'll then be able to pinpoint the exact issue.

---

## Architecture Notes

### Why Vision Feed Works But Main View Doesn't:

The vision feed uses a separate renderer attached to a specific canvas:
```typescript
const visionRenderer = new THREE.WebGLRenderer({
  canvas: visionCanvas,  // Pre-existing canvas with fixed size
  ...
});
```

The main renderer creates its own canvas dynamically:
```typescript
const renderer = new THREE.WebGLRenderer({ ... });
container.appendChild(renderer.domElement);  // Append to flex container
```

This means sizing issues only affect the main renderer, not the vision feed.

### Current Canvas Setup:
```
sceneArea (flex: 1, display: flex, flexDirection: column)
  └─ sceneContainer (position: relative, flex: 1, overflow: hidden)
       └─ <canvas> (position: absolute, width: 100%, height: 100%)
```

This should work! But flex layouts can be tricky with dynamic content.
