<h1>Content Library</h1>

<p>The Content Library is where admins and contributors collect study materials and turn them into <strong>AI-generated learning chunks</strong> that power question creation and module prep.</p>

<h2>What you can do</h2>
<ul>
	<li><strong>Upload PDFs</strong> and automatically generate structured chunks</li>
	<li><strong>Review, edit, and delete</strong> chunks for accuracy</li>
	<li><strong>Rename and describe</strong> documents for your cohort</li>
	<li><strong>Select chunks</strong> to compile useful summaries for question writing</li>
</ul>

<h2>Who can access</h2>
<p>Admins and approved contributors in your cohort. Content is scoped to your cohort.</p>

<h2>Open the Library</h2>
<p>Go to <a href="/admin/library">Admin → Content Library</a>.</p>

<h2>Upload a PDF</h2>
<ol>
	<li>Click <strong>Add Document</strong>.</li>
	<li>Drag and drop a <strong>PDF</strong> into the uploader.</li>
	<li>After upload, you’ll be taken to the new document’s page. You’ll see a <em>Processing PDF Document</em> state while chunks are generated.</li>
</ol>

<p>Titles are auto-generated from the file name and made unique in your cohort. A description is added with file details; you can edit it later.</p>

<h2>How chunking works</h2>
<p>LearnTerms analyzes your PDF and returns 5–15 meaningful chunks when possible. Each chunk has:</p>
<ul>
	<li><strong>Title</strong> and a brief <strong>summary</strong></li>
	<li>Full <strong>content</strong> (what gets used for question writing)</li>
	<li>3–5 <strong>keywords</strong></li>
	<li>A <strong>type</strong>: <code>paragraph</code>, <code>slide_group</code>, <code>diagram</code>, <code>table</code>, or <code>list</code></li>
</ul>

<h2>Working with chunks</h2>
<ul>
	<li><strong>Browse</strong>: Expand “View full content” to read a chunk.</li>
	<li><strong>Select</strong>: Use the <em>Select</em> checkbox on any chunk to collect multiple chunks. Click <em>Clear selection</em> to reset.</li>
	<li><strong>Edit</strong>: Click the <em>⋮</em> menu → <em>Edit chunk</em>. You can change Title, Summary, Content, Keywords, and Type.</li>
	<li><strong>Delete</strong>: Use the <em>⋮</em> menu → <em>Delete chunk</em> to remove it.</li>
</ul>

<h3>Editing guidelines</h3>
<ul>
	<li><strong>Title</strong>: 2–200 characters</li>
	<li><strong>Summary</strong>: 10–1000 characters</li>
	<li><strong>Content</strong>: at least 10 characters</li>
	<li><strong>Keywords</strong>: comma‑separated list (e.g., <em>beta blockers, adrenergic, pharmacology</em>)</li>
</ul>

<h2>Document management</h2>
<h3>Edit details</h3>
<ol>
	<li>In the table, open the <em>⋮</em> menu on a document.</li>
	<li>Choose <strong>Edit</strong> to update Title or Description.</li>
</ol>

<p>Rules: Title must be unique in your cohort (2–100 chars). Description is optional (10–500 chars if provided).</p>

<h3>Delete a document</h3>
<ol>
	<li>Open the <em>⋮</em> menu → <strong>Delete</strong>.</li>
	<li>Confirm in the dialog.</li>
</ol>

<p>Deleted documents are removed from your library view. This helps keep your workspace clean and focused.</p>

<h2>Tips</h2>
<ul>
	<li><strong>Large PDFs</strong>: Processing may take a minute. You’ll see loading skeletons while chunks are being created.</li>
	<li><strong>Tables</strong>: We render tables using Markdown; very large tables may be split across multiple chunks.</li>
	<li><strong>Add more sources</strong>: Create another document for additional PDFs. Each document keeps its own chunk set.</li>
</ul>

<h2>Troubleshooting</h2>
<ul>
	<li><strong>“You need to be assigned to a cohort”</strong>: Ask an admin to add you to a cohort before uploading.</li>
	<li><strong>Upload errors</strong>: Only PDFs are supported in the uploader.</li>
	<li><strong>No chunks appeared</strong>: Refresh the document page after a minute. If it persists, try re-uploading or contact an admin.</li>
	<li><strong>Duplicate title</strong>: Rename the document; titles must be unique within your cohort.</li>
</ul>
