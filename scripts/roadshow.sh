#!/usr/bin/env bash
# 路演片：把抓到的整页截图合成一支 ~38 秒的 MP4（等比推镜 + 淡入淡出 + 中文字幕 + 首尾卡）。
# 用法：bash scripts/roadshow.sh <截图目录> [输出文件]
set -euo pipefail

SRC="${1:?需要截图目录}"
OUT="${2:-docs/roadshow.mp4}"
FF="/c/Users/SZC/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.1-full_build/bin/ffmpeg.exe"
[ -x "$FF" ] || FF="$(command -v ffmpeg || true)"
[ -x "$FF" ] || { echo "找不到 ffmpeg"; exit 1; }
FONT="C\\:/Windows/Fonts/msyh.ttc"
WORK=".roadshow-tmp"
rm -rf "$WORK"; mkdir -p "$WORK" "$(dirname "$OUT")"

FPS=25
HOLD=2.6
FRAMES=$(python -c "print(int($HOLD*$FPS))")
FADE_OUT=$(python -c "print(round($HOLD-0.4,2))")

# 每张截图对应的说明（按抓取顺序）
CAPTIONS=(
  "首页 · 六座知识山"
  "推荐流 · 按兴趣挑一座"
  "策展资料 · 每条都有出处"
  "山页 · 前三个营地默认解锁"
  "3D 山体 · 自动运镜（山脚营地）"
  "3D 山体 · 沿盘山小径上行"
  "3D 山体 · 山顶对齐台"
  "节点页 · 先看材料与知乎真实讨论"
  "节点页 · 再自己回答，完成理解确认"
  "资料馆 · 49 条可追溯资料"
  "知乎知识作品货架 · 真实封面与标题"
  "理解图谱 · 走过的路与留下的判断"
)

# 1) 首尾卡
"$FF" -y -f lavfi -i "color=c=0x056DE8:s=1280x720:d=3.2" \
  -vf "drawtext=fontfile='$FONT':text='看山不是山':fontcolor=white:fontsize=76:x=(w-text_w)/2:y=250,\
drawtext=fontfile='$FONT':text='让知识有路径 · 知识山微缩沙盘 × 知乎真实讨论':fontcolor=0xCFE3FB:fontsize=30:x=(w-text_w)/2:y=360,\
fade=t=in:st=0:d=0.5,fade=t=out:st=2.7:d=0.5" \
  -c:v libx264 -pix_fmt yuv420p -r $FPS "$WORK/clip_00.mp4" >/dev/null 2>&1

# 2) 每张：先等比缩放到 16:9 画布（避免推镜时被拉伸），再缓慢推近，叠中文字幕
i=1
for img in "$SRC"/*.png; do
  n=$(printf "%02d" "$i")
  cap="${CAPTIONS[$((i-1))]:-}"
  "$FF" -y -loop 1 -i "$img" -t $HOLD \
    -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0xF6F7F8,\
zoompan=z='1+0.05*on/$FRAMES':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=$FRAMES:s=1280x720:fps=$FPS,\
drawtext=fontfile='$FONT':text='$cap':fontcolor=white:fontsize=26:x=28:y=h-72:box=1:boxcolor=0x121212@0.62:boxborderw=14,\
fade=t=in:st=0:d=0.4,fade=t=out:st=$FADE_OUT:d=0.4" \
    -c:v libx264 -pix_fmt yuv420p -r $FPS "$WORK/clip_$n.mp4" >/dev/null 2>&1
  i=$((i+1))
done

"$FF" -y -f lavfi -i "color=c=0x121212:s=1280x720:d=3.2" \
  -vf "drawtext=fontfile='$FONT':text='全部内容可离线运行 · 知乎数据经开放平台接口获取':fontcolor=white:fontsize=32:x=(w-text_w)/2:y=300,\
drawtext=fontfile='$FONT':text='看山不是山 · Demo':fontcolor=0x056DE8:fontsize=44:x=(w-text_w)/2:y=380,\
fade=t=in:st=0:d=0.5,fade=t=out:st=2.7:d=0.5" \
  -c:v libx264 -pix_fmt yuv420p -r $FPS "$WORK/clip_99.mp4" >/dev/null 2>&1

# 3) 拼接（同参数 → concat 解复用器最快最稳）
: > "$WORK/list.txt"
for f in "$WORK"/clip_*.mp4; do echo "file '$(basename "$f")'" >> "$WORK/list.txt"; done
"$FF" -y -f concat -safe 0 -i "$WORK/list.txt" -c copy -movflags +faststart "$OUT" >/dev/null 2>&1

size=$(stat -c %s "$OUT")
dur=$("$FF" -i "$OUT" 2>&1 | grep -o "Duration: [0-9:.]*" | head -1)
echo "成片：$OUT | ${dur#Duration: } | $((size/1024)) KB | $((i-1)) 张截图 + 首尾卡"
