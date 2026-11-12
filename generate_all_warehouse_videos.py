import cv2
import numpy as np
import math
import os

width, height = 1280, 720
fps = 30
duration = 10  # 10s seamless loop = 300 frames
total_frames = duration * fps
out_dir = r'frontend/public/videos'
os.makedirs(out_dir, exist_ok=True)

modes = ['role-selection', 'login', 'owner', 'farmer', 'stakeholder']

origin_x = width // 2
origin_y = int(height * 0.32)
tile_w = 96
tile_h = 50

# Pre-generate shelves
shelves = []
for r in range(4):
    for c in range(6):
        for t in range(3):
            sx = int(origin_x + (c - r) * (tile_w * 0.5))
            sy = int(origin_y + (c + r) * (tile_h * 0.5) - t * 40)
            shelves.append({'r': r, 'c': c, 't': t, 'x': sx, 'y': sy})

# Base sensor paths
paths = []
for r in range(4):
    p1 = (int(origin_x + (0 - r) * (tile_w * 0.5)), int(origin_y + (0 + r) * (tile_h * 0.5)))
    p2 = (int(origin_x + (5 - r) * (tile_w * 0.5)), int(origin_y + (5 + r) * (tile_h * 0.5)))
    paths.append((p1, p2))
for c in [1, 3, 5]:
    p1 = (int(origin_x + (c - 0) * (tile_w * 0.5)), int(origin_y + (c + 0) * (tile_h * 0.5) - 80))
    p2 = (int(origin_x + (c - 3) * (tile_w * 0.5)), int(origin_y + (c + 3) * (tile_h * 0.5)))
    paths.append((p1, p2))

fourcc = cv2.VideoWriter_fourcc(*'mp4v')

for mode in modes:
    filename = f'warehouse-{mode}.mp4'
    if mode in ['owner', 'farmer', 'stakeholder']:
        filename = f'warehouse-{mode}-dashboard.mp4'
    out_path = os.path.join(out_dir, filename)
    writer = cv2.VideoWriter(out_path, fourcc, fps, (width, height))
    print(f'Rendering {mode} to {out_path}...')

    # Mode parameters
    if mode == 'role-selection':
        num_frost = 32
        frost_speed = (1.0, 1.8)
        num_sensors = 5
        sensor_speed = 0.2
        glow_freq = 2.5
        glow_int = 0.5
        sensor_colors = [(0, 165, 255), (0, 215, 255)]  # Orange/Yellow BGR
        frost_colors = [(250, 245, 240)]
    elif mode == 'login':
        num_frost = 45
        frost_speed = (1.5, 2.5)
        num_sensors = 8
        sensor_speed = 0.35  # Faster "system waking up"
        glow_freq = 3.5      # More frequent glow
        glow_int = 0.8
        sensor_colors = [(0, 140, 255), (0, 215, 255), (255, 120, 0)]
        frost_colors = [(255, 250, 245)]
    elif mode == 'owner':
        num_frost = 10
        frost_speed = (0.7, 1.2)
        num_sensors = 3
        sensor_speed = 0.18
        glow_freq = 1.2
        glow_int = 0.3
        sensor_colors = [(80, 200, 30), (30, 200, 250)]  # Green healthy / Yellow warning
        frost_colors = [(240, 240, 240)]
    elif mode == 'farmer':
        num_frost = 25
        frost_speed = (1.0, 1.6)
        num_sensors = 4
        sensor_speed = 0.22
        glow_freq = 1.8
        glow_int = 0.4
        sensor_colors = [(0, 180, 255), (60, 210, 50)]   # Orange batch / Green produce
        frost_colors = [(250, 250, 250), (120, 230, 100)]  # White cold / Green produce
    elif mode == 'stakeholder':
        num_frost = 6
        frost_speed = (0.5, 1.0)
        num_sensors = 3
        sensor_speed = 0.16
        glow_freq = 1.0
        glow_int = 0.25
        sensor_colors = [(30, 180, 245), (10, 140, 240)]  # Amber / Gold (ROI)
        frost_colors = [(235, 235, 245)]

    # Particles
    frost = [
        {
            'x': np.random.uniform(0, width),
            'y': np.random.uniform(0, height),
            'speed': np.random.uniform(*frost_speed),
            'radius': np.random.randint(2, 4),
            'color': frost_colors[i % len(frost_colors)]
        }
        for i in range(num_frost)
    ]

    sensors = [
        {
            'path': i % len(paths),
            'offset': i / num_sensors,
            'color': sensor_colors[i % len(sensor_colors)]
        }
        for i in range(num_sensors)
    ]

    for frame_idx in range(total_frames):
        t_sec = frame_idx / fps
        img = np.zeros((height, width, 3), dtype=np.uint8)

        # Lighter industrial dusk background (+15-20% brightness)
        img[:] = (48, 38, 28)  # BGR

        # Thermal gradient overlay for login & dashboards
        if mode in ['login', 'owner', 'farmer']:
            for y_line in range(0, height, 4):
                ratio = y_line / height
                b_val = int(35 * (1.0 - ratio * 0.4))
                g_val = int(24 * ratio)
                r_val = int(14 * ratio)
                img[y_line:y_line+4, :] = np.clip(img[y_line:y_line+4, :] + (b_val, g_val, r_val), 0, 255)

        # Path rails
        for p1, p2 in paths:
            cv2.line(img, p1, p2, (85, 72, 60), 1, cv2.LINE_AA)

        # Shelves (Lighter grey #5A6A7A)
        for sh in shelves:
            sx, sy = sh['x'], sh['y']
            # Uprights (Lighter metallic steel)
            cv2.line(img, (sx - 32, sy - 18), (sx - 32, sy + 18), (115, 98, 80), 2, cv2.LINE_AA)
            cv2.line(img, (sx + 32, sy - 18), (sx + 32, sy + 18), (115, 98, 80), 2, cv2.LINE_AA)

            pts = np.array([
                [sx - 32, sy],
                [sx, sy - 16],
                [sx + 32, sy],
                [sx, sy + 16]
            ], np.int32)

            pulse = math.sin((t_sec * glow_freq + (sh['r'] + sh['c'])) * math.pi)
            if pulse > (1.0 - glow_int * 0.5):
                cv2.fillPoly(img, [pts], (255, 230, 0))  # Vivid cyan/blue glow in BGR
            else:
                cv2.fillPoly(img, [pts], (105, 90, 75))  # Lighter grey beam in BGR
            cv2.polylines(img, [pts], True, (135, 118, 100), 1, cv2.LINE_AA)

            # Cold bin
            box_pts = np.array([
                [sx - 14, sy - 4],
                [sx + 14, sy - 4],
                [sx + 14, sy - 16],
                [sx - 14, sy - 16]
            ], np.int32)
            cv2.fillPoly(img, [box_pts], (240, 180, 20) if pulse > (1.0 - glow_int * 0.5) else (125, 95, 45))

        # Sensor packets
        for s in sensors:
            prog = (s['offset'] + t_sec * sensor_speed) % 1.0
            p1, p2 = paths[s['path']]
            px = int(p1[0] + (p2[0] - p1[0]) * prog)
            py = int(p1[1] + (p2[1] - p1[1]) * prog)

            # Stakeholder upward drift
            if mode == 'stakeholder':
                py -= int(math.sin(prog * math.pi) * 15)

            cv2.circle(img, (px, py), 5, s['color'], -1, cv2.LINE_AA)
            cv2.circle(img, (px, py), 2, (255, 255, 255), -1, cv2.LINE_AA)

        # Frost particles
        for f in frost:
            curr_y = int((f['y'] + f['speed'] * frame_idx) % height)
            curr_x = int(f['x'] + math.sin(frame_idx * 0.04 + f['x']) * 6)
            cv2.circle(img, (curr_x, curr_y), f['radius'], f['color'], -1, cv2.LINE_AA)

        writer.write(img)

    writer.release()
    print(f'Done {filename}: {os.path.getsize(out_path)} bytes')

# Also duplicate files for standard lookup
import shutil
shutil.copyfile(os.path.join(out_dir, 'warehouse-owner-dashboard.mp4'), os.path.join(out_dir, 'warehouse-owner.mp4'))
shutil.copyfile(os.path.join(out_dir, 'warehouse-farmer-dashboard.mp4'), os.path.join(out_dir, 'warehouse-farmer.mp4'))
shutil.copyfile(os.path.join(out_dir, 'warehouse-stakeholder-dashboard.mp4'), os.path.join(out_dir, 'warehouse-stakeholder.mp4'))

print('All 5 warehouse videos generated successfully!')
