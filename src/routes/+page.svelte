<script lang="ts">
	import { PokeSchema } from '$lib/pokeschema';
	import '$lib/app.css';
	import { createHighlighter, type Highlighter } from 'shiki';

	let schemaInput = $state('');
	let generatedTypes = $state('');
	let styledTypes = $state('');
	let errorMessage = $state('');

	type Theme = 'min-dark' | 'material-theme-darker' | 'aurora-x' | 'ayu-dark' | 'vitesse-dark';
	const theme: Theme = 'ayu-dark';
	const codeBlockColor = $derived.by(setCodeBlockColor);

	function setCodeBlockColor(): string {
		switch (theme) {
			case 'min-dark':
				return '#1f1f1f';
			case 'material-theme-darker':
				return '#212121';
			case 'aurora-x':
				return '#07090f';
			default:
				return '#0b0e14';
		}
	}

	async function getHighLighter(): Promise<Highlighter> {
		return await createHighlighter({ themes: [theme], langs: ['typescript'] });
	}

	async function handleGeneration() {
		errorMessage = '';
		generatedTypes = '';
		styledTypes = '';
		const highlighter = await getHighLighter();

		if (!schemaInput) {
			errorMessage = 'Please enter a schema';
			return;
		}

		try {
			const processor = new PokeSchema(schemaInput);
			const types = await processor.generateTypes();
			generatedTypes = types;

			if (highlighter) {
				styledTypes = await highlighter.codeToHtml(types, {
					lang: 'typescript',
					theme
				});
			}
		} catch (err) {
			if (err instanceof Error) {
				errorMessage = err.message;
			} else {
				errorMessage = 'Unknown error';
			}
		}
	}

	async function copyToClipboard(text: string) {
		try {
			await navigator.clipboard.writeText(text);
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}

	async function copyFromClipboard() {
		try {
			schemaInput = await navigator.clipboard.readText();
		} catch (err) {
			console.error('Failed to read text from clipboard:', err);
		}
	}
</script>

<main>
	<div class="container">
		<header class="header">
			<h1><span class="highlight">poke</span>Schema</h1>
			<p class="subheading">Generate TypeScript Types from Your PocketBase Schema</p>
		</header>

		<section class="input-section">
			<label for="schema-input" class="label">Paste your PocketBase schema:</label>
			<button class="paste-button" onclick={copyFromClipboard}>Paste from Clipboard</button>
			<textarea
				id="schema-input"
				class="textarea"
				bind:value={schemaInput}
				placeholder="Paste your schema here..."
				style="background-color: {codeBlockColor}"
			></textarea>
			<button class="generate-button" onclick={handleGeneration} disabled={!schemaInput}>
				Generate Types
			</button>
		</section>

		{#if errorMessage}
			<p class="error">{errorMessage}</p>
		{/if}

		{#if styledTypes}
			<section class="output-section">
				<h3 class="output-heading">Generated Types</h3>
				<div class="code-block" style="background-color: {codeBlockColor};">
					{@html styledTypes}
				</div>
				<button class="copy-button" onclick={() => copyToClipboard(generatedTypes)}>
					Copy Types
				</button>
			</section>
		{/if}
	</div>
</main>
