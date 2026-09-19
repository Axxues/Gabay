async function checkCors() {
  const res = await fetch("https://gabay.zyberlab.com/auth/login", {
    method: "OPTIONS",
    headers: {
      "Origin": "http://localhost:5173",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "Content-Type",
    },
  });
  console.log("OPTIONS status:", res.status);
  console.log("Response headers:");
  for (const [k, v] of res.headers.entries()) {
    console.log(`  ${k}: ${v}`);
  }
}
checkCors().catch(console.error);
