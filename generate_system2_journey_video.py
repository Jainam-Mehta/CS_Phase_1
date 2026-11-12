import cv2
import numpy as np
import math
import os
import shutil
import sys

# -----------------------------------------------------------------------------
# SystmII Role Selection Page - System 2 Journey: Unified Single-Canvas Composition
#
# Specifications:
# - Single unified continuous composition (NO horizontal layer boundaries)
# - Natural depth layering: Far hills -> Mid-hill -> Warehouse -> Foreground hill -> Sky elements
# - Agricultural foundation (pure greens #558B2F, #7CB342, #9CCC65, white windmill, brown soil #8B6D47)
# - Solid, cohesive, fluffy white clouds (pure #FFFFFF, NO internal seams/divisions)
# - Centered warehouse (~33% width) grounded into the farmland
# - Upward growth lines (gold & emerald) flowing up from warehouse to top sky
# - Seamless 6.0s loop (360 frames, 60fps) with 0 pixel boundary difference
# - Target MP4: H.264, < 5MB
# -----------------------------------------------------------------------------

WIDTH, HEIGHT = 1920, 1080
FPS = 60
DURATION = 6.0
TOTAL_FRAMES = int(DURATION * FPS)

PUBLIC_DIR = os.path.join('frontend', 'public', 'videos')
DIST_DIR = os.path.join('frontend', 'dist', 'videos')
os.makedirs(PUBLIC_DIR, exist_ok=True)
if os.path.exists('frontend/dist'):
    os.makedirs(DIST_DIR, exist_ok=True)

# -----------------------------------------------------------------------------
# EXACT COLOR PALETTE (Converted to BGR for OpenCV)
# -----------------------------------------------------------------------------
# Sky Gradient: Deep Navy (top) -> Steel Blue (mid) -> Warm Peach (bottom)
COLOR_SKY_TOP = np.array([95, 58, 30], dtype=np.float32)    # #1E3A5F deep navy
COLOR_SKY_MID = np.array([105, 85, 71], dtype=np.float32)   # #475569 steel blue
COLOR_SKY_BOT = np.array([95, 151, 232], dtype=np.float32)  # #E8975F warm peach

# Agriculture Foundation (Pure Greens)
COLOR_HILL_FAR   = (47, 139, 85)     # #558B2F dark sage
COLOR_HILL_MID   = (66, 179, 124)    # #7CB342 primary sage
COLOR_HILL_FORE  = (101, 204, 156)   # #9CCC65 bright highlight green
COLOR_WINDMILL   = (255, 255, 255)   # #FFFFFF pure white
COLOR_SUN_CORE   = (19, 184, 253)    # #FDB813 golden yellow
COLOR_SUN_INNER  = (35, 166, 245)    # #F5A623 golden orange
COLOR_SUN_OUTER  = (179, 222, 245)   # #F5DEB3 warm peach
COLOR_CROP_ROW   = (47, 139, 85)     # #558B2F green crop pattern
COLOR_GROUND_SOIL= (71, 109, 139)    # #8B6D47 earth brown

# Cold Storage Facility (Steel & Precision)
COLOR_WH_BODY    = (139, 116, 100)   # #64748B steel grey
COLOR_WH_ROOF    = (99, 85, 75)      # #4B5563 dark steel
COLOR_WH_OUTLINE = (255, 255, 255)   # #FFFFFF crisp white
COLOR_WINDOW_GLASS = (130, 82, 44)   # #2C5282 dark blue glass
COLOR_WINDOW_TINT  = (248, 189, 56)  # #38BDF8 subtle sky reflection
COLOR_GRID_LINE  = (184, 163, 148)   # #94A3B8 subtle steel grid
COLOR_COOL_BASE  = (102, 87, 30)     # #1E5766 dark teal base
COLOR_COOL_FLOW  = (212, 182, 6)     # #06B6D4 cool cyan
COLOR_PANEL_BG   = (64, 37, 26)      # #1A2540 dark navy
COLOR_PANEL_CYAN = (212, 182, 6)     # #06B6D4 cyan border
COLOR_PANEL_TEXT = (255, 240, 0)     # #00F0FF bright cyan
COLOR_STATUS_LED = (129, 185, 16)    # #10B981 emerald green

# Investment Growth (Gold & Emerald Prosperity)
COLOR_GROWTH_GOLD    = (36, 191, 251)   # #FBBF24 gold
COLOR_GROWTH_EMERALD = (129, 185, 16)   # #10B981 emerald green
COLOR_GROWTH_LGOLD   = (77, 211, 252)   # #FCD34D light gold
COLOR_CHECKMARK      = (129, 185, 16)   # #10B981 emerald green
COLOR_SUCCESS_RAY    = (0, 215, 255)    # #FFD700 radiant gold

# -----------------------------------------------------------------------------
# PRECOMPUTE CONTINUOUS SKY GRADIENT
# -----------------------------------------------------------------------------
STATIC_SKY = np.zeros((HEIGHT, WIDTH, 3), dtype=np.uint8)
for y in range(HEIGHT):
    frac = y / HEIGHT
    if frac < 0.50:
        sub = frac / 0.50
        c = COLOR_SKY_TOP * (1.0 - sub) + COLOR_SKY_MID * sub
    else:
        sub = (frac - 0.50) / 0.50
        c = COLOR_SKY_MID * (1.0 - sub) + COLOR_SKY_BOT * sub
    STATIC_SKY[y, :] = c.astype(np.uint8)


def draw_vector_checkmark(img, cx, cy, size, color, alpha=1.0, thickness=2):
    """Draws crisp anti-aliased checkmark"""
    p1 = (int(cx - size * 0.45), int(cy))
    p2 = (int(cx - size * 0.10), int(cy + size * 0.40))
    p3 = (int(cx + size * 0.50), int(cy - size * 0.45))
    if alpha < 0.99:
        overlay = img.copy()
        cv2.line(overlay, p1, p2, color, thickness, cv2.LINE_AA)
        cv2.line(overlay, p2, p3, color, thickness, cv2.LINE_AA)
        cv2.addWeighted(overlay, alpha, img, 1.0 - alpha, 0, img)
    else:
        cv2.line(img, p1, p2, color, thickness, cv2.LINE_AA)
        cv2.line(img, p2, p3, color, thickness, cv2.LINE_AA)


def render_unified_system2_frame(t_in):
    """
    Renders 1 frame of the unified single-canvas System 2 Journey.
    All motions are periodic with T=DURATION (6.0s) for 0-difference seamless looping.
    """
    t = float(t_in % DURATION)

    # 1. Base Sky Gradient across entire canvas (NO borders, NO dividers)
    img = STATIC_SKY.copy()

    # -------------------------------------------------------------------------
    # 2. SUCCESS RAYS (Top center radiating downward)
    # -------------------------------------------------------------------------
    ray_origin = (int(WIDTH * 0.5), 0)
    ray_pulse = math.sin(t * (2.0 * math.pi / 3.0)) * 0.5 + 0.5
    ray_alpha = 0.15 + 0.12 * ray_pulse

    overlay_rays = img.copy()
    for ang in [-0.34, -0.17, 0.0, 0.17, 0.34]:
        tx = int(WIDTH * 0.5 + math.tan(ang) * 580)
        ty = 500
        cv2.line(overlay_rays, ray_origin, (tx, ty), (200, 245, 255), 2, cv2.LINE_AA)
        cv2.line(overlay_rays, ray_origin, (tx, ty), COLOR_SUCCESS_RAY, 5, cv2.LINE_AA)
    cv2.addWeighted(overlay_rays, ray_alpha, img, 1.0 - ray_alpha, 0, img)

    # -------------------------------------------------------------------------
    # 3. CLOUDS (Solid, opaque, cohesive white blobs - NO internal divisions)
    # Rendered as unified binary mask + edge softness for natural fluffy finish
    # -------------------------------------------------------------------------
    cloud_mask = np.zeros((HEIGHT, WIDTH), dtype=np.uint8)
    cloud_configs = [
        {'x_base': int(WIDTH * 0.28), 'y': 290, 'w': 120, 'h': 36},
        {'x_base': int(WIDTH * 0.74), 'y': 340, 'w': 100, 'h': 30},
        {'x_base': int(WIDTH * 0.52), 'y': 220, 'w': 85, 'h': 25},
    ]
    for c_idx, c in enumerate(cloud_configs):
        drift = math.sin(t * (2.0 * math.pi / 6.0) + c_idx * 1.6) * 10.0
        cx = int(c['x_base'] + drift)
        cy = c['y']
        cw, ch = c['w'], c['h']

        # Fill seamless base rect and lobes into binary mask (all value 255)
        cv2.rectangle(cloud_mask, (cx - int(cw * 0.55), cy + 2), (cx + int(cw * 0.55), cy + ch), 255, -1)
        cv2.circle(cloud_mask, (cx, cy), ch, 255, -1)
        cv2.circle(cloud_mask, (cx - int(cw * 0.35), cy + 4), int(ch * 0.82), 255, -1)
        cv2.circle(cloud_mask, (cx + int(cw * 0.35), cy + 3), int(ch * 0.78), 255, -1)
        cv2.circle(cloud_mask, (cx - int(cw * 0.55), cy + 8), int(ch * 0.58), 255, -1)
        cv2.circle(cloud_mask, (cx + int(cw * 0.55), cy + 8), int(ch * 0.58), 255, -1)

    # Apply slight edge-softening to boundary only (core is 100% solid white)
    blur_mask = cv2.GaussianBlur(cloud_mask, (7, 7), 1.8)
    cloud_alpha = blur_mask.astype(np.float32) / 255.0
    cloud_alpha_3d = cloud_alpha[:, :, None]
    pure_white = np.array([255, 255, 255], dtype=np.float32)
    img = (img * (1.0 - cloud_alpha_3d) + pure_white * cloud_alpha_3d).astype(np.uint8)

    # -------------------------------------------------------------------------
    # 4. SUN & GOLDEN GLOW (Right side, ~85% X, just above horizon, Y ~ 650)
    # -------------------------------------------------------------------------
    sun_x = int(WIDTH * 0.85)
    sun_y = 650
    sun_pulse = math.sin(t * (2.0 * math.pi / 6.0)) * 0.5 + 0.5
    sun_scale = 1.0 + 0.15 * sun_pulse

    # Outer peach glow
    overlay_sun = img.copy()
    cv2.circle(overlay_sun, (sun_x, sun_y), int(105 * sun_scale), COLOR_SUN_OUTER, -1, cv2.LINE_AA)
    cv2.addWeighted(overlay_sun, 0.12 * (0.7 + 0.3 * sun_pulse), img, 1.0 - 0.12 * (0.7 + 0.3 * sun_pulse), 0, img)

    # Inner golden orange glow
    overlay_sun_in = img.copy()
    cv2.circle(overlay_sun_in, (sun_x, sun_y), int(60 * sun_scale), COLOR_SUN_INNER, -1, cv2.LINE_AA)
    cv2.addWeighted(overlay_sun_in, 0.40 * (0.7 + 0.3 * sun_pulse), img, 1.0 - 0.40 * (0.7 + 0.3 * sun_pulse), 0, img)

    # Core golden yellow disc
    cv2.circle(img, (sun_x, sun_y), int(30 * sun_scale), COLOR_SUN_CORE, -1, cv2.LINE_AA)
    cv2.circle(img, (sun_x, sun_y), int(14 * sun_scale), (255, 255, 255), -1, cv2.LINE_AA)

    # -------------------------------------------------------------------------
    # 5. UPWARD GROWTH LINES (Top 40%: flow upward from warehouse level to top sky)
    # -------------------------------------------------------------------------
    growth_lines_spec = [
        {'start_x': 0.18, 'end_x': 0.26, 'color': COLOR_GROWTH_GOLD, 'w': 3, 'phase': 0.0},
        {'start_x': 0.40, 'end_x': 0.50, 'color': COLOR_GROWTH_EMERALD, 'w': 3, 'phase': 1.0},
        {'start_x': 0.64, 'end_x': 0.74, 'color': COLOR_GROWTH_LGOLD, 'w': 3, 'phase': 2.0},
        {'start_x': 0.82, 'end_x': 0.90, 'color': COLOR_GROWTH_EMERALD, 'w': 3, 'phase': 3.0},
    ]

    for g_idx, g in enumerate(growth_lines_spec):
        pts = []
        steps = 70
        x0 = int(g['start_x'] * WIDTH)
        x1 = int(g['end_x'] * WIDTH)
        y0 = 660
        y1 = 75 + g_idx * 16

        for i in range(steps + 1):
            s = i / steps
            px = int(x0 + (x1 - x0) * (s ** 1.25) + math.sin(s * math.pi * 1.5 + g['phase']) * (WIDTH * 0.012))
            py = int(y0 - (y0 - y1) * (1.0 - (1.0 - s) ** 2))
            pts.append([px, py])

        pts_arr = np.array(pts, dtype=np.int32)
        cv2.polylines(img, [pts_arr], isClosed=False, color=g['color'], thickness=g['w'], lineType=cv2.LINE_AA)

        # Traveling Energy Shimmer (3s cycle)
        pkt_prog = ((t / 3.0) + g['phase'] / 3.0) % 1.0
        pkt_idx = min(int(pkt_prog * steps), steps)
        pkt_pt = pts[pkt_idx]

        overlay_shimmer = img.copy()
        cv2.circle(overlay_shimmer, tuple(pkt_pt), 8, (255, 255, 255), -1, cv2.LINE_AA)
        cv2.addWeighted(overlay_shimmer, 0.50, img, 0.50, 0, img)
        cv2.circle(img, tuple(pkt_pt), 5, (255, 255, 255), -1, cv2.LINE_AA)

        # Pulsing Nodes
        for node_i, frac_n in enumerate([0.33, 0.67, 1.0], start=1):
            n_idx = min(int(frac_n * steps), steps)
            n_pt = pts[n_idx]
            pulse = math.sin(t * (2.0 * math.pi / 3.0) + node_i * 1.2 + g_idx) * 0.5 + 0.5
            node_r = int(5 + pulse * 3)

            overlay_node = img.copy()
            cv2.circle(overlay_node, tuple(n_pt), node_r + 6, g['color'], -1, cv2.LINE_AA)
            cv2.addWeighted(overlay_node, 0.40, img, 0.60, 0, img)

            cv2.circle(img, tuple(n_pt), node_r, g['color'], -1, cv2.LINE_AA)
            cv2.circle(img, tuple(n_pt), max(2, node_r - 3), (255, 255, 255), -1, cv2.LINE_AA)

    # Checkmarks (✓) in top area
    checkmarks_cfg = [
        (int(WIDTH * 0.28), 180, 0.0),
        (int(WIDTH * 0.50), 140, 1.0),
        (int(WIDTH * 0.72), 190, 2.0),
    ]
    for cx, cy, phase in checkmarks_cfg:
        c_alpha = 0.35 + 0.55 * (math.sin((t + phase) * (2.0 * math.pi / 2.0)) * 0.5 + 0.5)
        c_scale = 1.0 + 0.08 * math.sin((t + phase) * (2.0 * math.pi / 2.0))
        draw_vector_checkmark(img, cx, cy, round(18 * c_scale), COLOR_CHECKMARK, alpha=c_alpha, thickness=2)

    # -------------------------------------------------------------------------
    # 6. FAR ROLLING HILL (Dark Sage #558B2F - Pure Green)
    # -------------------------------------------------------------------------
    breathe = math.sin(t * (2.0 * math.pi / 6.0)) * 1.8

    hill1_pts = []
    for x in range(0, WIDTH + 20, 20):
        hy = int(680 + math.sin(x * 0.0028 + 0.5) * 40 + math.cos(x * 0.006) * 15 + breathe)
        hill1_pts.append([x, hy])
    hill1_pts.append([WIDTH, HEIGHT])
    hill1_pts.append([0, HEIGHT])
    cv2.fillPoly(img, [np.array(hill1_pts, dtype=np.int32)], COLOR_HILL_FAR)

    # -------------------------------------------------------------------------
    # 7. MID ROLLING HILL (Primary Sage #7CB342 - Pure Green)
    # -------------------------------------------------------------------------
    hill2_pts = []
    for x in range(0, WIDTH + 15, 15):
        hy = int(775 + math.sin(x * 0.0035 + 2.1) * 45 + math.cos(x * 0.0075) * 16 - breathe)
        hill2_pts.append([x, hy])
    hill2_pts.append([WIDTH, HEIGHT])
    hill2_pts.append([0, HEIGHT])
    cv2.fillPoly(img, [np.array(hill2_pts, dtype=np.int32)], COLOR_HILL_MID)

    # -------------------------------------------------------------------------
    # 8. WINDMILL (Left side, ~20% X, sitting directly on mid-hill)
    # -------------------------------------------------------------------------
    wm_x = int(WIDTH * 0.20)
    wm_base_y = int(775 + math.sin(wm_x * 0.0035 + 2.1) * 45 + math.cos(wm_x * 0.0075) * 16 - breathe)
    wm_tower_h = 75
    wm_hub_y = wm_base_y - wm_tower_h

    # Windmill ground shadow (dark green #142814, 20% alpha)
    overlay_wm_sh = img.copy()
    cv2.ellipse(overlay_wm_sh, (wm_x, wm_base_y), (18, 5), 0, 0, 360, (20, 40, 20), -1)
    cv2.addWeighted(overlay_wm_sh, 0.20, img, 0.80, 0, img)

    # Windmill Tower & Hub (Pure White #FFFFFF)
    cv2.line(img, (wm_x, wm_base_y), (wm_x, wm_hub_y), COLOR_WINDMILL, 3, cv2.LINE_AA)
    cv2.circle(img, (wm_x, wm_hub_y), 5, COLOR_WINDMILL, -1, cv2.LINE_AA)

    # 3 Rotating Blades (1 rotation per 6s, clockwise, crisp white)
    rot_angle = t * (2.0 * math.pi / 6.0)
    blade_len = 32
    for b_idx in range(3):
        b_ang = rot_angle + b_idx * (2.0 * math.pi / 3.0)
        bx = int(wm_x + math.sin(b_ang) * blade_len)
        by = int(wm_hub_y - math.cos(b_ang) * blade_len)
        cv2.line(img, (wm_x, wm_hub_y), (bx, by), COLOR_WINDMILL, 2, cv2.LINE_AA)

    # -------------------------------------------------------------------------
    # 9. COLD STORAGE FACILITY (Warehouse centered at 50% X, overlaps mid-hill)
    # Dimensions: ~33% width (~634px), ~170px height
    # -------------------------------------------------------------------------
    wh_w = int(WIDTH * 0.33)
    wh_h = 170
    wh_x = int(WIDTH * 0.50 - wh_w * 0.5)
    wh_y = 660
    wh_base_y = wh_y + wh_h
    roof_h = 55

    # Shadow beneath building (ellipse, dark #0F172A, 40% alpha)
    overlay_wh_sh = img.copy()
    cv2.ellipse(overlay_wh_sh, (wh_x + wh_w // 2, wh_base_y + 8), (wh_w // 2 + 25, 18), 0, 0, 360, (42, 23, 15), -1)
    cv2.addWeighted(overlay_wh_sh, 0.40, img, 0.60, 0, img)

    # Warehouse Body: Steel Grey #64748B (NOT affected by agricultural sky)
    cv2.rectangle(img, (wh_x, wh_y), (wh_x + wh_w, wh_base_y), COLOR_WH_BODY, -1)

    # Pitched Roof: Darker Steel #4B5563
    roof_pts = np.array([
        [wh_x - 14, wh_y],
        [wh_x + wh_w // 2, wh_y - roof_h],
        [wh_x + wh_w + 14, wh_y]
    ], dtype=np.int32)
    cv2.fillPoly(img, [roof_pts], COLOR_WH_ROOF)

    # Grid Pattern Overlay on Warehouse (20-32% alpha, 3s cycle, thin lines every 16px)
    grid_alpha = 0.20 + 0.12 * (math.sin(t * (2.0 * math.pi / 3.0)) * 0.5 + 0.5)
    overlay_grid = img.copy()
    for gx in range(wh_x, wh_x + wh_w, 16):
        cv2.line(overlay_grid, (gx, wh_y), (gx, wh_base_y), COLOR_GRID_LINE, 1)
    for gy in range(wh_y, wh_base_y, 16):
        cv2.line(overlay_grid, (wh_x, gy), (wh_x + wh_w, gy), COLOR_GRID_LINE, 1)
    cv2.addWeighted(overlay_grid, grid_alpha, img, 1.0 - grid_alpha, 0, img)

    # Crisp White Outline on Warehouse Perimeter (#FFFFFF, 2px)
    cv2.rectangle(img, (wh_x, wh_y), (wh_x + wh_w, wh_base_y), COLOR_WH_OUTLINE, 2, cv2.LINE_AA)
    cv2.polylines(img, [roof_pts], isClosed=True, color=COLOR_WH_OUTLINE, thickness=2, lineType=cv2.LINE_AA)

    # Windows (3x2 grid, crisp visible, dark blue glass #2C5282 with reflection)
    win_w, win_h = 44, 30
    win_spacing_x = int((wh_w - 3 * win_w) / 4)
    win_y1 = wh_y + 40
    win_y2 = wh_y + 100
    for c_i in range(3):
        wx = wh_x + win_spacing_x * (c_i + 1) + win_w * c_i
        for wy in [win_y1, win_y2]:
            cv2.rectangle(img, (wx, wy), (wx + win_w, wy + win_h), COLOR_WINDOW_GLASS, -1)
            cv2.line(img, (wx + 4, wy + win_h - 4), (wx + win_w - 4, wy + 4), COLOR_WINDOW_TINT, 1, cv2.LINE_AA)
            cv2.rectangle(img, (wx, wy), (wx + win_w, wy + win_h), (255, 255, 255), 1, cv2.LINE_AA)
            cv2.line(img, (wx + win_w // 2, wy), (wx + win_w // 2, wy + win_h), (255, 255, 255), 1)
            cv2.line(img, (wx, wy + win_h // 2), (wx + win_w, wy + win_h // 2), (255, 255, 255), 1)

    # Cooling Flow (3 vertical cyan lines on left side of warehouse)
    cool_x_start = wh_x - 36
    cool_len = 135
    cool_y_base = wh_y + 35
    for c_i in range(3):
        lx = cool_x_start + c_i * 10
        flow_offset = (t / 2.0) % 1.0
        cv2.line(img, (lx, cool_y_base), (lx, cool_y_base + cool_len), COLOR_COOL_BASE, 2, cv2.LINE_AA)
        for seg in range(4):
            sy = cool_y_base + int(((flow_offset + seg / 4.0) % 1.0) * cool_len)
            cv2.line(img, (lx, max(cool_y_base, sy - 14)), (lx, min(cool_y_base + cool_len, sy + 6)), COLOR_COOL_FLOW, 3, cv2.LINE_AA)

    # Digital Readout Panel (Top-right of warehouse)
    disp_w, disp_h = 125, 46
    disp_x = wh_x + wh_w - disp_w - 30
    disp_y = wh_y + 35
    panel_pulse = math.sin(t * (2.0 * math.pi / 2.0)) * 0.5 + 0.5
    panel_alpha = 0.85 + 0.15 * panel_pulse

    overlay_disp = img.copy()
    cv2.rectangle(overlay_disp, (disp_x, disp_y), (disp_x + disp_w, disp_y + disp_h), COLOR_PANEL_BG, -1)
    cv2.addWeighted(overlay_disp, panel_alpha, img, 1.0 - panel_alpha, 0, img)
    cv2.rectangle(img, (disp_x, disp_y), (disp_x + disp_w, disp_y + disp_h), COLOR_PANEL_CYAN, 2, cv2.LINE_AA)

    cv2.putText(img, "-18.4 C", (disp_x + 12, disp_y + 30), cv2.FONT_HERSHEY_SIMPLEX, 0.62, COLOR_PANEL_TEXT, 2, cv2.LINE_AA)
    cv2.circle(img, (disp_x + 94, disp_y + 16), 3, COLOR_PANEL_TEXT, 1, cv2.LINE_AA)

    # Status LED (Top-right corner of warehouse perimeter)
    led_x = wh_x + wh_w - 18
    led_y = wh_y + 18
    led_pulse = math.sin(t * (2.0 * math.pi / 2.0)) * 0.5 + 0.5
    led_glow_r = int(6 + led_pulse * 8)
    led_alpha = 0.50 + 0.50 * led_pulse

    overlay_led = img.copy()
    cv2.circle(overlay_led, (led_x, led_y), led_glow_r, COLOR_STATUS_LED, -1, cv2.LINE_AA)
    cv2.addWeighted(overlay_led, led_alpha, img, 1.0 - led_alpha, 0, img)
    cv2.circle(img, (led_x, led_y), 5, COLOR_STATUS_LED, -1, cv2.LINE_AA)
    cv2.circle(img, (led_x, led_y), 2, (255, 255, 255), -1, cv2.LINE_AA)

    # -------------------------------------------------------------------------
    # 10. FOREGROUND ROLLING HILL (Bright Highlight #9CCC65 - Pure Green)
    # -------------------------------------------------------------------------
    hill3_pts = []
    for x in range(0, WIDTH + 15, 15):
        hy = int(880 + math.cos(x * 0.0032 + 1.0) * 40 + math.sin(x * 0.008) * 15 + breathe * 0.6)
        hill3_pts.append([x, hy])
    hill3_pts.append([WIDTH, HEIGHT])
    hill3_pts.append([0, HEIGHT])
    cv2.fillPoly(img, [np.array(hill3_pts, dtype=np.int32)], COLOR_HILL_FORE)

    # -------------------------------------------------------------------------
    # 11. CROP ROWS (Subtle thin green horizontal lines #558B2F, 12% alpha, ~11px apart)
    # -------------------------------------------------------------------------
    overlay_crops = img.copy()
    for row_y in range(830, HEIGHT - 18, 11):
        cv2.line(overlay_crops, (0, row_y), (WIDTH, row_y), COLOR_CROP_ROW, 1, cv2.LINE_AA)
    cv2.addWeighted(overlay_crops, 0.12, img, 0.88, 0, img)

    # -------------------------------------------------------------------------
    # 12. SOIL GROUND (Solid brown bar #8B6D47, 16px height at bottom edge)
    # -------------------------------------------------------------------------
    cv2.rectangle(img, (0, HEIGHT - 16), (WIDTH, HEIGHT), COLOR_GROUND_SOIL, -1)
    cv2.line(img, (0, HEIGHT - 16), (WIDTH, HEIGHT - 16), (95, 135, 170), 1, cv2.LINE_AA)

    return img


def generate_video():
    out_filename = 'system2-journey-loop.mp4'
    public_target = os.path.join(PUBLIC_DIR, out_filename)

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    writer = cv2.VideoWriter(public_target, fourcc, FPS, (WIDTH, HEIGHT))

    if not writer.isOpened():
        print(f"Error: Could not open VideoWriter for {public_target}")
        sys.exit(1)

    print(f"Rendering {TOTAL_FRAMES} frames (60fps, 6.0s seamless loop, unified single-canvas) to {public_target}...")

    for frame_idx in range(TOTAL_FRAMES):
        t = frame_idx / FPS
        frame = render_unified_system2_frame(t)
        writer.write(frame)
        if (frame_idx + 1) % 60 == 0 or frame_idx == TOTAL_FRAMES - 1:
            progress = ((frame_idx + 1) / TOTAL_FRAMES) * 100.0
            print(f"  Frame {frame_idx + 1}/{TOTAL_FRAMES} ({progress:.1f}%) rendered")

    writer.release()
    print("Video encoding complete!")

    file_size_mb = os.path.getsize(public_target) / (1024 * 1024)
    print(f"Generated {public_target}: {file_size_mb:.2f} MB (Target < 5MB: {'PASSED' if file_size_mb < 5.0 else 'EXCEEDED'})")

    # Update warehouse-role-selection.mp4 as well
    wh_target = os.path.join(PUBLIC_DIR, 'warehouse-role-selection.mp4')
    shutil.copy2(public_target, wh_target)
    print(f"Updated default role selection video: {wh_target}")

    # Copy to dist/videos if dist exists
    if os.path.exists('frontend/dist/videos'):
        dist_target = os.path.join('frontend/dist/videos', out_filename)
        shutil.copy2(public_target, dist_target)
        shutil.copy2(public_target, os.path.join('frontend/dist/videos', 'warehouse-role-selection.mp4'))
        print(f"Copied to {dist_target} and frontend/dist/videos/warehouse-role-selection.mp4")


if __name__ == '__main__':
    generate_video()
