async function checkCors() {
  const res = await fetch("https://gabay.zyberlab.com/auth/login", {
    method: "OPTIONS",
    headers: {
      "Origin": "https://gabay.zyberlab.com",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "Content-Type",
    },
  });
  console.log("OPTIONS status:", res.status);
  console.log("access-control-allow-origin header:", res.headers.get("access-control-allow-origin"));
}
checkCors().catch(console.error);
