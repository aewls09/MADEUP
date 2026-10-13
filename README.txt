사용 방법
========================================

1) 이 폴더에 아래 파일을 같은 이름으로 넣으세요.
   - background.mp4   메인 배경 영상 (무한 재생)
   - logo.png         좌상단 로고 (누르면 메인으로)
   - work-01.png ~ work-05.png, work-06.mp4   Selected 페이지 작업물

   다른 파일명을 쓰려면 selected.html 안의 WORKS 목록에서 file 값만 바꾸면 됩니다.
   (제목·분류·연도·카드 배경색도 같은 곳에서 수정)

2) Archive 내용은 archive.txt 를 메모장으로 열어 수정합니다.
   형식:  연도 | 프로젝트명 | 클라이언트 | 분류 | 링크(선택)

   ※ html을 더블클릭으로 바로 열면 브라우저 보안 때문에 archive.txt를 못 읽고,
     archive.html 안의 예비 목록이 보입니다. VS Code "Live Server"로 열거나
     호스팅(Netlify, GitHub Pages 등)에 올리면 archive.txt가 그대로 반영됩니다.

3) 배경 영상이 "버퍼링 없이" 바로 나오게 하려면 영상을 웹용으로 한 번 변환하세요.
   (재생 정보를 파일 앞쪽으로 옮기고 용량을 줄여 첫 프레임이 즉시 뜹니다)

   ffmpeg -i 원본.mp4 -c:v libx264 -crf 26 -preset slow -an -movflags +faststart -vf "scale=-2:1080" background.mp4

   권장: 10초 안팎 루프, 소리 없음, 5MB 이하.

4) 색 바꾸기: style.css 맨 위 --mint / --ink / --paper.
   Info(어두운 화면)에서 로고는 흰색으로 바뀝니다. 원치 않으면 style.css의
   ".is-dark .logo img" 줄을 지우세요.

사용 라이브러리 (CDN, 인터넷 연결 필요)
- GSAP 3.12.5 + ScrollTrigger : 스크롤 핀 / 스크럽 애니메이션
- Lenis 1.1.13 : 데스크톱 휠 부드러운 스크롤
- three.js r128 : Info 페이지 3D
