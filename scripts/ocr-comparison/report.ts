import showdown from 'showdown';
import sanitize from 'sanitize-html';
const root = 'tmp/ocr-comparison';
const [m, d, mm, dm, s] = await Promise.all(
	['mistral.pages', 'datalab.pages', 'mistral.metrics', 'datalab.metrics', 'sample'].map((n) =>
		Bun.file(`${root}/${n}.json`).json()
	)
);
const converter = new showdown.Converter({ tables: true });
const render = (text: string) =>
	sanitize(
		converter.makeHtml(
			text.replace(/!\[[^\]]*\]\([^)]*\)/g, '*[Image detected; content not described]*')
		),
		{ allowedTags: sanitize.defaults.allowedTags.filter((t) => t !== 'a'), allowedAttributes: {} }
	);
let sections = '';
for (let i = 0; i < m.length; i++) {
	const img = Buffer.from(await Bun.file(`${root}/source-${i + 1}.png`).arrayBuffer()).toString(
		'base64'
	);
	sections += `<section><h2>Source page ${s.sourcePages[i]}</h2><details><summary>View source slide</summary><img alt="Source slide ${s.sourcePages[i]}" src="data:image/png;base64,${img}"></details><div class="cols"><article><h3>Mistral</h3>${render(m[i].text)}</article><article><h3>Datalab Fast</h3>${render(d[i].text)}</article></div></section>`;
}
await Bun.write(
	`${root}/comparison.html`,
	`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'"><title>Fast OCR comparison</title><style>body{font:16px/1.6 system-ui;background:#f4f4ef;color:#24362f;margin:0}main{max-width:1250px;margin:auto;padding:32px}section{padding:24px;background:white;border:1px solid #ccd6ce;border-radius:12px;margin:24px 0}.cols{display:grid;grid-template-columns:1fr 1fr;gap:32px}article{min-width:0;overflow-wrap:anywhere}article h1{font-size:24px}h3{border-bottom:2px solid #388677;padding-bottom:12px}table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px}img{max-width:100%}summary{cursor:pointer}@media(max-width:750px){.cols{grid-template-columns:1fr}}</style><main><p>LEARNTERMS · 20 SEPTEMBER 2026</p><h1>Datalab Fast vs Mistral</h1><p>Seven identical pages: Mistral <strong>${(mm.elapsedMs / 1000).toFixed(2)} seconds</strong>; Datalab Fast <strong>${(dm.elapsedMs / 1000).toFixed(2)} seconds</strong>. Both standard rates: <strong>$4/1,000 pages</strong>. Datalab API charge: <strong>$0.028</strong>; Mistral standard-rate estimate: <strong>$0.028</strong>.</p><p>Fast was about 9% quicker than the earlier 20.31-second Balanced observation, but that is a separate run, not a controlled estimate of mode improvement. Mistral cache status was not returned; Datalab cache bypass was explicitly enabled. One run each does not establish typical latency.</p><p>Both retained numeric prescriptions and six table thresholds. Datalab read NBEO better, but omitted the JAMA and Maher citation footnotes. Its article output contains text obscured on the source slide; provenance of that extra text was not established. Neither provider described clinical photographs. No downstream question-generation test was run.</p><p>Historical comparison only. The current application uses Datalab Fast with structured output and retained citation footers; these observations describe the earlier benchmark configuration.</p>${sections}</main></html>`
);
