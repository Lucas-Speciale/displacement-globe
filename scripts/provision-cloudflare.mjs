const PROJECT_NAME = "displacement-globe";
const PRODUCTION_BRANCH = "main";
const CUSTOM_DOMAIN = "displacementglobe.lucasspeciale.com";
const DNS_TARGET = "displacement-globe.pages.dev";
const ZONE_NAME = "lucasspeciale.com";

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

async function ensureDnsRecord() {
  const zones = await request(
    `/zones?name=${encodeURIComponent(ZONE_NAME)}&status=active`,
  );
  assertSuccess(zones, `Finding the ${ZONE_NAME} Cloudflare zone`);

  const zone = zones.payload.result?.find((item) => item.name === ZONE_NAME);

  if (!zone) {
    throw new Error(`The active ${ZONE_NAME} Cloudflare zone was not found.`);
  }

  const recordsPath = `/zones/${zone.id}/dns_records`;
  const records = await request(
    `${recordsPath}?name=${encodeURIComponent(CUSTOM_DOMAIN)}`,
  );
  assertSuccess(records, `Reading the ${CUSTOM_DOMAIN} DNS record`);

  const existing = records.payload.result?.[0];

  if (existing) {
    if (
      existing.type !== "CNAME" ||
      existing.content !== DNS_TARGET ||
      existing.proxied !== true
    ) {
      throw new Error(
        `The existing ${CUSTOM_DOMAIN} DNS record has unexpected settings; refusing to overwrite it.`,
      );
    }

    console.log(`DNS record ${CUSTOM_DOMAIN} is ready.`);
    return;
  }

  const created = await request(recordsPath, {
    method: "POST",
    body: JSON.stringify({
      type: "CNAME",
      name: CUSTOM_DOMAIN,
      content: DNS_TARGET,
      proxied: true,
      ttl: 1,
    }),
  });

  assertSuccess(created, `Creating the ${CUSTOM_DOMAIN} DNS record`);
  console.log(`Created DNS record ${CUSTOM_DOMAIN}.`);
}

await ensureProject();
await ensureCustomDomain();
await ensureDnsRecord();
