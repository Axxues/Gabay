async function checkSettings() {
  const loginRes = await fetch("https://gabay.zyberlab.com/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "jayveegenetareyes@gmail.com", password: "qwerty12345" }),
  });
  const loginJson = await loginRes.json();
  const token = loginJson?.data?.access_token;
  const res = await fetch("https://gabay.zyberlab.com/settings", {
    headers: { Authorization: "Bearer " + token },
  });
  console.log("Settings status:", res.status);
  const json = await res.json();
  console.log("Settings keys:", Object.keys(json?.data || {}));
  console.log("Project name:", json?.data?.project_name);
  console.log("CORS in settings?:", Object.keys(json?.data || {}).filter(k => k.includes("cors")));
}
checkSettings().catch(console.error);
