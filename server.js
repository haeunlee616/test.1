const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// index.html, style.css, script.js를 그대로 정적 파일로 내려줌
app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
