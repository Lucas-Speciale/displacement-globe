const PROJECT_NAME = "displacement-globe";
const PRODUCTION_BRANCH = "main";
const CUSTOM_DOMAIN = "displacementglobe.lucasspeciale.com";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;

if (!accountId || !apiToken) {
  throw new Error(
    "CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required.",
  );
}

const apiRoot = "https://api.cloudflare.com/client/v4";

async function request(path, init = {}) {
  const response = await fetch(`${apiRoot}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  const payload = await response.json();
  return { response, payload };
}

function isMissing({ response, payload }) {
  return (
    response.status === 404 ||
    payload.errors?.some((error) => error.code === 8000007)
  );
}

function assertSuccess(result, action) {
  if (result.response.ok && result.payload.success) {
    return;
  }

  const details = result.payload.errors
    ?.map((error) => error.message)
    .filter(Boolean)
    .join("; ");

  throw new Error(`${action} failed${details ? `: ${details}` : "."}`);
}

async function ensureProject() {
  const pagesRoot = `/accounts/${accountId}/pages`;
  const path = `${pagesRoot}/projects/${encodeURIComponent(PROJECT_NAME)}`;
  const existing = await request(path);

  if (existing.response.ok && existing.payload.success) {
    console.log(`Cloudflare Pages project ${PROJECT_NAME} is ready.`);
    return;
  }

  if (!isMissing(existing)) {
    assertSuccess(existing, "Reading the Cloudflare Pages project");
  }

  const created = await request(`${pagesRoot}/projects`, {
    method: "POST",
    body: JSON.stringify({
      name: PROJECT_NAME,
      production_branch: PRODUCTION_BRANCH,
    }),
  });

  assertSuccess(created, "Creating the Cloudflare Pages project");
  console.log(`Created Cloudflare Pages project ${PROJECT_NAME}.`);
}

async function ensureCustomDomain() {
  const pagesRoot = `/accounts/${accountId}/pages`;
  const project = encodeURIComponent(PROJECT_NAME);
  const domain = encodeURIComponent(CUSTOM_DOMAIN);
  const existing = await request(
    `${pagesRoot}/projects/${project}/domains/${domain}`,
  );

  if (existing.response.ok && existing.payload.success) {
    console.log(`Custom domain ${CUSTOM_DOMAIN} is ready.`);
    return;
  }

  if (!isMissing(existing)) {
    assertSuccess(existing, "Reading the Cloudflare Pages custom domain");
  }

  const created = await request(`${pagesRoot}/projects/${project}/domains`, {
    method: "POST",
    body: JSON.stringify({ name: CUSTOM_DOMAIN }),
  });

  assertSuccess(created, "Adding the Cloudflare Pages custom domain");
  console.log(`Added custom domain ${CUSTOM_DOMAIN}.`);
}

await ensureProject();
await ensureCustomDomain();
