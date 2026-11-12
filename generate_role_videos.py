import cv2
import numpy as np
import math
import os

width, height = 1280, 720
fps = 30
duration = 8  # 8s seamless loop = 240 frames (<5MB per video)
total_frames = duration * fps
out_dir = r'frontend/public/videos'
os.makedirs(out_dir, exist_ok=True)

fourcc = cv2.VideoWriter_fourcc(*'mp4v')

def render_farmer_video():
    out_path = os.path.join(out_dir, 'farmer-landscape-loop.mp4')
    writer = cv2.VideoWriter(out_path, fourcc, fps, (width, height))
    print(f'Rendering Farmer landscape (+70% bright daytime) to {out_path}...')

    clouds = [
        {'x': 0.15, 'y': 0.13, 'w': 200, 'h': 46, 'speed': 0.015, 'alpha': 0.9},
        {'x': 0.55, 'y': 0.20, 'w': 250, 'h': 54, 'speed': 0.02, 'alpha': 0.85},
        {'x': 0.82, 'y': 0.11, 'w': 170, 'h': 40, 'speed': 0.012, 'alpha': 0.85},
    ]

    frost = [
        {
            'x': np.random.rand(),
            'y': 0.62 + np.random.rand() * 0.38,
            'speed_x': 0.03 + np.random.rand() * 0.04,
            'size': int(1.8 + np.random.rand() * 3.2),
            'seed': np.random.rand() * math.pi * 2
        }
        for _ in range(45)
    ]

    for frame_idx in range(total_frames):
        t = (frame_idx / fps)
        img = np.zeros((height, width, 3), dtype=np.uint8)

        # 1. Daytime Sky Gradient (BGR: Clear Azure to Warm Golden Horizon)
        for y in range(int(height * 0.78)):
            r = y / (height * 0.78)
            # Top: #1E88E5 -> BGR: (229, 136, 30)
            # Mid: #7DD3FC -> BGR: (252, 211, 125)
            # Horizon: #FEF08A -> BGR: (138, 240, 254)
            if r < 0.5:
                sub_r = r / 0.5
                b = int(229 * (1 - sub_r) + 252 * sub_r)
                g = int(136 * (1 - sub_r) + 211 * sub_r)
                rv = int(30 * (1 - sub_r) + 125 * sub_r)
            else:
                sub_r = (r - 0.5) / 0.5
                b = int(252 * (1 - sub_r) + 138 * sub_r)
                g = int(211 * (1 - sub_r) + 240 * sub_r)
                rv = int(125 * (1 - sub_r) + 254 * sub_r)
            img[y, :] = (b, g, rv)

        # 2. Brilliant Midday Sun
        sun_x = int(width * 0.82)
        sun_y = int(height * 0.20)
        cv2.circle(img, (sun_x, sun_y), 130, (140, 230, 255), -1) # Radiant aura
        cv2.circle(img, (sun_x, sun_y), 70, (180, 245, 255), -1)  # Corona
        cv2.circle(img, (sun_x, sun_y), 36, (255, 255, 255), -1)  # Pure white disc

        # 3. Fluffy Daytime White Clouds
        for c in clouds:
            cx = int(((c['x'] + c['speed'] * t) % 1.25 - 0.1) * width)
            cy = int(c['y'] * height)
            cv2.ellipse(img, (cx, cy), (c['w'] // 2, c['h'] // 2), 0, 0, 360, (255, 255, 255), -1)
            cv2.ellipse(img, (cx - 30, cy + 3), (c['w'] // 3, c['h'] // 3), 0, 0, 360, (255, 255, 255), -1)
            cv2.ellipse(img, (cx + 35, cy + 2), (c['w'] // 3, c['h'] // 3), 0, 0, 360, (255, 255, 255), -1)

        # 4. Far Mountain Ridge (Teal/Green: BGR (72, 107, 42))
        ridge1 = []
        for x in range(0, width + 10, 20):
            y = int(height * 0.46 + math.sin(x * 0.003 + 1) * 35 + math.cos(x * 0.007) * 15)
            ridge1.append([x, y])
        ridge1.append([width, height])
        ridge1.append([0, height])
        cv2.fillPoly(img, [np.array(ridge1, dtype=np.int32)], (72, 107, 42))

        # 5. Midground Terraced Hill (Lush Emerald: BGR (44, 139, 61))
        ridge2 = []
        for x in range(0, width + 10, 15):
            y = int(height * 0.54 + math.sin(x * 0.0042 + 2.4) * 40 + math.sin(x * 0.009) * 12)
            ridge2.append([x, y])
        ridge2.append([width, height])
        ridge2.append([0, height])
        cv2.fillPoly(img, [np.array(ridge2, dtype=np.int32)], (44, 139, 61))

        # Cold depot facility + blinking green LED
        hub_x = int(width * 0.65)
        hub_y = int(height * 0.54)
        cv2.rectangle(img, (hub_x, hub_y - 18), (hub_x + 44, hub_y), (139, 116, 100), -1)
        cv2.circle(img, (hub_x + 22, hub_y - 18), 22, (139, 116, 100), -1)
        cv2.circle(img, (hub_x + 22, hub_y - 40), 4, (129, 255, 16), -1)

        # Dual Farm Windmills (Left & Right, balanced composition, lowered naturally into farmland)
        rot = t * 1.6
        for wx, wy, phase in [(int(width * 0.18), int(height * 0.52), 0), (int(width * 0.82), int(height * 0.52), 0.8)]:
            hub_y = wy - 42
            cv2.line(img, (wx, wy), (wx, hub_y), (255, 255, 255), 2)
            cv2.circle(img, (wx, hub_y), 3, (255, 255, 255), -1)
            for blade in range(3):
                angle = rot + phase + blade * (2 * math.pi / 3)
                bx = int(wx + math.sin(angle) * 22)
                by = int(hub_y - math.cos(angle) * 22)
                cv2.line(img, (wx, hub_y), (bx, by), (255, 255, 255), 2)

        # 6. Foreground Agricultural Hill (Sunlit Green: BGR (56, 166, 82))
        ridge3 = []
        for x in range(0, width + 10, 15):
            y = int(height * 0.66 + math.cos(x * 0.0035 + 0.8) * 45 + math.sin(x * 0.008) * 14)
            ridge3.append([x, y])
        ridge3.append([width, height])
        ridge3.append([0, height])
        cv2.fillPoly(img, [np.array(ridge3, dtype=np.int32)], (56, 166, 82))

        # Highlighted furrow contour lines
        for row in range(4):
            offset = row * 16
            furrow = []
            for x in range(0, width + 10, 20):
                y = int(height * 0.69 + offset + math.cos(x * 0.0035 + 0.8) * 42)
                furrow.append([x, y])
            for i in range(len(furrow) - 1):
                cv2.line(img, tuple(furrow[i]), tuple(furrow[i+1]), (172, 239, 134), 2)

        # Red agricultural rover
        harv_x = int(((0.3 + t * 0.015) % 1.2 - 0.1) * width)
        harv_y = int(height * 0.66 + math.cos(harv_x * 0.0035 + 0.8) * 45)
        cv2.rectangle(img, (harv_x, harv_y - 14), (harv_x + 20, harv_y - 4), (72, 29, 225), -1)
        cv2.circle(img, (harv_x + 4, harv_y - 4), 4, (20, 20, 20), -1)
        cv2.circle(img, (harv_x + 16, harv_y - 4), 4, (20, 20, 20), -1)

        # 7. Birds in V-formation
        for b_idx, (bx_off, by_off) in enumerate([(0, 0), (20, 15), (40, 30), (-20, 12), (-40, 25)]):
            bx = int(((0.1 + bx_off * 0.001 + t * 0.04) % 1.2 - 0.1) * width)
            by = int((0.17 + by_off * 0.001) * height + math.sin(t * 2 + b_idx) * 8)
            wing = int(math.sin(t * 6 + b_idx) * 4)
            cv2.line(img, (bx - 6, by + wing), (bx, by), (59, 41, 30), 2)
            cv2.line(img, (bx, by), (bx + 6, by + wing), (59, 41, 30), 2)

        # 8. Brilliant Golden Wheat Foreground
        crop_base_y = int(height * 0.88)
        for i in range(0, width, 14):
            stalk_h = int(45 + math.sin(i * 3.7) * 18)
            sway = int(math.sin(t * 2.2 + i * 0.012) * 12 + math.cos(t * 3.5 + i * 0.025) * 5)
            tip_x = i + sway
            tip_y = crop_base_y - stalk_h

            color = (36, 191, 251) if i % 3 != 0 else (94, 222, 74) # Golden wheat BGR vs Fresh Green
            cv2.line(img, (i, crop_base_y), (tip_x, tip_y), color, 2)
            cv2.circle(img, (tip_x, tip_y), 3, color, -1)

        # 9. Sunlit Moisture Sparkles
        for p in frost:
            p['x'] = (p['x'] - p['speed_x'] * (1/fps) * 0.25) % 1.0
            px = int(p['x'] * width)
            py = int((p['y'] + math.sin(t * 1.5 + p['seed']) * 0.01) * height)
            cv2.circle(img, (px, py), p['size'], (255, 255, 255), -1)

        writer.write(img)

    writer.release()
    print('Farmer video completed!')

def render_owner_video():
    out_path = os.path.join(out_dir, 'owner-facility-loop.mp4')
    owner_duration = 5.5
    owner_frames = int(owner_duration * fps)
    writer = cv2.VideoWriter(out_path, fourcc, fps, (width, height))
    print(f'Rendering Owner facility (+30% well-lit) to {out_path}...')

    cx = width // 2
    cy = int(height * 0.42)

    vapor = [
        {
            'x': 0.3 + np.random.rand() * 0.4,
            'y': 0.16 + np.random.rand() * 0.7,
            'vy': 0.04 + np.random.rand() * 0.06,
            'vx': (np.random.rand() - 0.5) * 0.03,
            'size': int(4 + np.random.rand() * 10),
        }
        for _ in range(40)
    ]

    for frame_idx in range(owner_frames):
        t = (frame_idx / fps)
        img = np.zeros((height, width, 3), dtype=np.uint8)

        # 1. Industrial Background (+30% Brightness: BGR (60, 44, 28) to (46, 34, 22))
        for y in range(height):
            prog = y / height
            b = int(60 * (1 - prog) + 46 * prog)
            g = int(44 * (1 - prog) + 34 * prog)
            r = int(28 * (1 - prog) + 22 * prog)
            img[y, :] = (b, g, r)

        # 2. Ceiling Structural Perspective Lines
        for i in range(-4, 5):
            x1 = int(cx + i * (width * 0.14))
            x2 = int(cx + i * 26)
            cv2.line(img, (x1, 0), (x2, int(cy * 0.7)), (98, 76, 54), 2)
        for y in range(30, int(cy * 0.7), 35):
            cv2.line(img, (0, y), (width, y), (84, 64, 45), 1)

        # 3. Overhead Evaporator Coolers with Spinning Fans
        for side in [-1, 1]:
            cooler_x = int(cx + side * (width * 0.28))
            cooler_y = int(height * 0.16)
            cw, ch = 130, 44
            cv2.rectangle(img, (cooler_x - cw // 2, cooler_y - ch // 2), (cooler_x + cw // 2, cooler_y + ch // 2), (108, 82, 56), -1)
            cv2.rectangle(img, (cooler_x - cw // 2, cooler_y - ch // 2), (cooler_x + cw // 2, cooler_y + ch // 2), (248, 189, 56), 2)

            for fan_off in [-30, 30]:
                fx = cooler_x + fan_off
                cv2.circle(img, (fx, cooler_y), 14, (53, 37, 23), -1)
                for b_i in range(3):
                    b_ang = t * 8 + b_i * (2 * math.pi / 3)
                    bx = int(fx + math.sin(b_ang) * 11)
                    by = int(cooler_y - math.cos(b_ang) * 11)
                    cv2.line(img, (fx, cooler_y), (bx, by), (248, 189, 56), 2)

            cv2.circle(img, (cooler_x, cooler_y - ch // 3), 4, (255, 240, 0), -1)

        # 4. Polished Floor & Laser Nav Guide
        floor_pts = np.array([
            [0, cy], [width, cy], [width, height], [0, height]
        ], dtype=np.int32)
        cv2.fillPoly(img, [floor_pts], (56, 42, 27))

        for i in range(-5, 6):
            x2 = int(cx + i * (width * 0.18))
            cv2.line(img, (cx, cy + 10), (x2, height), (120, 85, 55), 1)

        # Cyan Laser Nav Line
        cv2.line(img, (cx, cy + 10), (cx, height), (255, 240, 0), 3)

        # 5. Multi-Tier Industrial Pallet Racks (Left & Right)
        for is_left in [True, False]:
            side = -1 if is_left else 1
            rack_base_x = int(cx + side * (width * 0.44))
            rack_inner_x = int(cx + side * (width * 0.14))

            # Steel Uprights
            cv2.rectangle(img, (rack_inner_x - 6, int(height * 0.22)), (rack_inner_x + 6, int(height * 0.94)), (111, 86, 62), -1)
            cv2.rectangle(img, (rack_base_x - 8, int(height * 0.18)), (rack_base_x + 8, int(height * 0.98)), (95, 75, 52), -1)

            # Orange horizontal beams
            for tier_frac, idx in [(0.35, 0), (0.52, 1), (0.72, 2)]:
                tier_y = int(height * tier_frac)
                cv2.line(img, (rack_inner_x, tier_y), (rack_base_x, tier_y - 14), (22, 115, 249), 4)

                # Pallet boxes (Vibrant Blue vs Cyan)
                for box_i in range(3):
                    bx = int(rack_inner_x + (rack_base_x - rack_inner_x) * (0.2 + box_i * 0.28))
                    by = int(tier_y - 12 - tier_frac * 6)
                    box_color = (235, 99, 37) if idx == 0 else (199, 132, 2)
                    cv2.rectangle(img, (bx - 14, by - 16), (bx + 14, by), box_color, -1)

                cv2.circle(img, (rack_inner_x, tier_y), 4, (255, 229, 0), -1)

        # 6. Real-time Telemetry HUD Panels (Well-lit)
        hud_l_x = int(cx - width * 0.22)
        hud_l_y = int(height * 0.44)
        cv2.rectangle(img, (hud_l_x, hud_l_y), (hud_l_x + 120, hud_l_y + 45), (56, 38, 24), -1)
        cv2.rectangle(img, (hud_l_x, hud_l_y), (hud_l_x + 120, hud_l_y + 45), (255, 200, 0), 1)
        cv2.putText(img, 'ZONE 01 [FREEZE]', (hud_l_x + 6, hud_l_y + 12), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (225, 213, 203), 1)
        temp1 = -18.4 + math.sin(t * 0.8) * 0.2
        cv2.putText(img, f'{temp1:.1f} C', (hud_l_x + 6, hud_l_y + 28), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (255, 240, 0), 1)
        cv2.putText(img, 'STATUS: OPTIMAL', (hud_l_x + 6, hud_l_y + 40), cv2.FONT_HERSHEY_SIMPLEX, 0.32, (153, 211, 52), 1)

        hud_r_x = int(cx + width * 0.12)
        hud_r_y = int(height * 0.44)
        cv2.rectangle(img, (hud_r_x, hud_r_y), (hud_r_x + 120, hud_r_y + 45), (56, 38, 24), -1)
        cv2.rectangle(img, (hud_r_x, hud_r_y), (hud_r_x + 120, hud_r_y + 45), (153, 211, 52), 1)
        cv2.putText(img, 'ZONE 02 [CHILL]', (hud_r_x + 6, hud_r_y + 12), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (225, 213, 203), 1)
        temp2 = 2.1 + math.cos(t * 0.7) * 0.2
        cv2.putText(img, f'+0{temp2:.1f} C', (hud_r_x + 6, hud_r_y + 28), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (153, 211, 52), 1)
        cv2.putText(img, 'HUMIDITY: 89% RH', (hud_r_x + 6, hud_r_y + 40), cv2.FONT_HERSHEY_SIMPLEX, 0.32, (248, 189, 56), 1)

        # 7. Automated Guided Vehicle (AGV)
        agv_prog = 0.25 + (math.sin(t * 0.6) * 0.5 + 0.5) * 0.5
        agv_y = int(cy + (agv_prog ** 1.8) * (height * 0.52))
        agv_scale = 0.4 + agv_prog * 0.7
        agv_x = int(cx + math.sin(agv_prog * math.pi) * 12)
        agv_w = int(48 * agv_scale)
        agv_h = int(22 * agv_scale)

        cv2.rectangle(img, (agv_x - agv_w // 2, agv_y - agv_h // 2), (agv_x + agv_w // 2, agv_y + agv_h // 2), (85, 65, 51), -1)
        cv2.rectangle(img, (agv_x - agv_w // 2, agv_y - agv_h // 2), (agv_x + agv_w // 2, agv_y + agv_h // 2), (36, 191, 251), 1)
        cv2.rectangle(img, (agv_x - int(agv_w * 0.4), agv_y - agv_h), (agv_x + int(agv_w * 0.4), agv_y - agv_h // 2), (199, 132, 2), -1)
        cv2.circle(img, (agv_x, agv_y - agv_h - 4), int(4 * agv_scale), (36, 191, 251), -1)

        # 8. Billowing Cryo Mist
        for p in vapor:
            p['y'] = (p['y'] + p['vy'] * (1/fps) * 0.6) % 0.95
            p['x'] = (p['x'] + p['vx'] * (1/fps)) % 0.8 + 0.1
            px = int(p['x'] * width)
            py = int(p['y'] * height)
            cv2.circle(img, (px, py), p['size'], (255, 245, 230), -1)

        writer.write(img)

    writer.release()
    print('Owner video completed!')

def render_stakeholder_video():
    out_path = os.path.join(out_dir, 'stakeholder-growth-loop.mp4')
    writer = cv2.VideoWriter(out_path, fourcc, fps, (width, height))
    print(f'Rendering Stakeholder growth (+35% golden success) to {out_path}...')

    network_nodes = [
        {'x': 0.16, 'y': 0.62, 'label': 'Central Hub', 'r': 7},
        {'x': 0.32, 'y': 0.48, 'label': 'Fleet Alpha', 'r': 6},
        {'x': 0.48, 'y': 0.55, 'label': 'Agro Hub', 'r': 6},
        {'x': 0.64, 'y': 0.36, 'label': 'Solar Port', 'r': 6},
        {'x': 0.78, 'y': 0.28, 'label': 'Terminal', 'r': 7},
        {'x': 0.42, 'y': 0.72, 'label': 'Logistics', 'r': 5},
        {'x': 0.68, 'y': 0.64, 'label': 'Yield Depot', 'r': 6},
    ]

    links = [(0, 1), (1, 2), (2, 3), (3, 4), (0, 5), (5, 6), (6, 4)]

    embers = [
        {
            'x': np.random.rand(),
            'y': np.random.rand(),
            'vy': 0.04 + np.random.rand() * 0.06,
            'size': int(2 + np.random.rand() * 3),
            'is_gold': np.random.rand() > 0.35
        }
        for _ in range(55)
    ]

    for frame_idx in range(total_frames):
        t = (frame_idx / fps)
        img = np.zeros((height, width, 3), dtype=np.uint8)

        # 1. Royal Navy Background (+35% Brightness: BGR (54, 32, 18) to (79, 47, 26))
        for y in range(height):
            prog = y / height
            b = int(54 * (1 - prog) + 79 * prog)
            g = int(32 * (1 - prog) + 47 * prog)
            r = int(18 * (1 - prog) + 26 * prog)
            img[y, :] = (b, g, r)

        # 2. Isometric Floor Grid
        grid_y = int(height * 0.62)
        for i in range(-8, 9):
            x1 = int(width * 0.5 + i * (width * 0.05))
            x2 = int(width * 0.5 + i * (width * 0.16))
            cv2.line(img, (x1, grid_y), (x2, height), (130, 85, 45), 1)
        for y in range(grid_y, height, 28):
            cv2.line(img, (0, y), (width, y), (115, 75, 40), 1)

        # 3. Interconnected Supply Chain Investment Network
        for i, j in links:
            n1 = network_nodes[i]
            n2 = network_nodes[j]
            p1 = (int(n1['x'] * width), int(n1['y'] * height))
            p2 = (int(n2['x'] * width), int(n2['y'] * height))
            cv2.line(img, p1, p2, (250, 165, 96), 1)

        # Traveling Data Packets
        for idx, (i, j) in enumerate(links):
            prog = (t * 0.4 + idx * 0.15) % 1.0
            n1 = network_nodes[i]
            n2 = network_nodes[j]
            px = int(n1['x'] * width + (n2['x'] * width - n1['x'] * width) * prog)
            py = int(n1['y'] * height + (n2['y'] * height - n1['y'] * height) * prog)
            pkt_color = (71, 224, 253) if idx % 2 == 0 else (129, 185, 16)
            cv2.circle(img, (px, py), 4, pkt_color, -1)

        # Network Nodes
        for n in network_nodes:
            nx = int(n['x'] * width)
            ny = int(n['y'] * height)
            cv2.circle(img, (nx, ny), n['r'] + 4, (129, 185, 16), 1)
            cv2.circle(img, (nx, ny), n['r'], (129, 185, 16), -1)
            cv2.putText(img, n['label'], (nx - 22, ny + 14), cv2.FONT_HERSHEY_SIMPLEX, 0.32, (225, 213, 203), 1)

        # 4. Secondary Gold Curve
        gold_pts = []
        for x in range(int(width * 0.08), int(width * 0.94), 14):
            norm = max(0.0, (x - width * 0.08) / (width * 0.86))
            y = int(height * 0.76 - (norm ** 1.25) * (height * 0.44) + math.sin(norm * 10 + t * 1.8) * 10)
            gold_pts.append([x, y])
        for i in range(len(gold_pts) - 1):
            cv2.line(img, tuple(gold_pts[i]), tuple(gold_pts[i+1]), (36, 191, 251), 3)

        # 5. Primary Growth Curve (Emerald/Teal BGR)
        growth_pts = []
        for x in range(int(width * 0.06), int(width * 0.95), 12):
            norm = max(0.0, (x - width * 0.06) / (width * 0.89))
            y = int(height * 0.82 - (norm ** 1.1) * (height * 0.56) + math.sin(norm * 8 - t * 2.2) * 14)
            growth_pts.append([x, y])

        for i in range(len(growth_pts) - 1):
            cv2.line(img, tuple(growth_pts[i]), tuple(growth_pts[i+1]), (129, 185, 16), 4)

        # Scan Pulse
        pulse_idx = int(((t * 0.35) % 1.0) * (len(growth_pts) - 1))
        cv2.circle(img, tuple(growth_pts[pulse_idx]), 7, (255, 255, 255), -1)

        # Milestone Badges
        for norm_val, label, sub in [(0.35, '+22.4% ROI', 'Q3 Yield'), (0.72, 'INR 4.8 Cr', 'AUM Value'), (0.94, '99.8%', 'Uptime')]:
            idx = min(int(norm_val * (len(growth_pts) - 1)), len(growth_pts) - 1)
            pt = growth_pts[idx]
            bx, by = pt[0] - 38, pt[1] - 36
            cv2.rectangle(img, (bx, by), (bx + 76, by + 28), (56, 38, 24), -1)
            cv2.rectangle(img, (bx, by), (bx + 76, by + 28), (153, 211, 52), 1)
            cv2.putText(img, label, (bx + 4, by + 12), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (128, 222, 74), 1)
            cv2.putText(img, sub, (bx + 4, by + 23), cv2.FONT_HERSHEY_SIMPLEX, 0.28, (240, 230, 220), 1)

        # 6. Rising Wealth Embers
        for p in embers:
            p['y'] = (p['y'] - p['vy'] * (1/fps) * 0.8) % 1.0
            px = int(p['x'] * width + math.sin(t * 2 + p['y'] * 10) * 8)
            py = int(p['y'] * height)
            color = (71, 224, 253) if p['is_gold'] else (153, 211, 52)
            cv2.circle(img, (px, py), p['size'], color, -1)

        writer.write(img)

    writer.release()
    print('Stakeholder video completed!')

if __name__ == '__main__':
    render_farmer_video()
    render_owner_video()
    render_stakeholder_video()
    print('All 3 bright role videos successfully rendered!')
