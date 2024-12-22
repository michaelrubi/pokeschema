import type { PbCollection, PbField } from './types';

/*
function pbFieldToDexieIndex(field: PbField): string {
	let index = '';

	if (field.unique) {
		index += '&';
	}

	// Remove COLLATE NOCASE
	index += field.name.replace(/ COLLATE NOCASE/i, '');

	return index;
}

export function convertSchema(pbSchema: PbCollection[]): {
	[key: string]: string;
} {
	const dexieSchema: { [key: string]: string } = {};

	for (const collection of pbSchema) {
		// Skip system collections
		if (collection.name.startsWith('_')) {
			continue;
		}

		const indexes: string[] = [];

		for (const field of collection.fields) {
			// Skip system fields and 'id'
			if ((field.system && field.name !== 'id') || indexes.includes(field.name)) {
				// console.log('Skipping field: ', field.name);
				continue;
			}
			const index = pbFieldToDexieIndex(field);

			if (index) {
				indexes.push(index);
			}
		}

		// Handle custom indexes
		if (collection.indexes) {
			const processedIndexes = processCollectionIndexes(collection.indexes);
			indexes.push(...processedIndexes);
		}

		dexieSchema[collection.name] = indexes.join(',');
	}

	return dexieSchema;
}

function processCollectionIndexes(indexes: string[]) {
	const processedIndexes: string[] = [];
	for (const index of indexes) {
		const matches = index.match(/\(([^)]+)\)/);
		if (matches && matches[1]) {
			const fields = matches[1].split(',').map((field) =>
				field
					.trim()
					.replace(/`/g, '')
					.replace(/ COLLATE NOCASE/i, '')
			);
			// Exclude 'id'
			// if (!fields.includes('id')) {
			// 	processedIndexes.push(fields.join(','));
			// }
		}
	}
	return processedIndexes;
}

export async function schemaToTypes(pbRawSchema: string): Promise<string> {
	let types = '';
	try {
		// const schemaFileContent = await Deno.readTextFile(schemaFile);

		// const pbSchema: PbCollection[] = JSON.parse(schemaFileContent);
		const pbSchema: PbCollection[] = JSON.parse(pbRawSchema);

		types = generateTypesFromSchema(pbSchema);

		// await Deno.writeTextFile(outputPath, types);
		// console.log(`Types generated and saved to ${outputPath}`);
		console.log(`Types generated`);
	} catch (error) {
		console.error('Error generating types:', error);
	}

	return types;
}

function generateTypesFromSchema(pbSchema: PbCollection[]): string {
	let types = '';

	for (const collection of pbSchema) {
		if (collection.name.startsWith('_')) continue;

		const collectionName = capitalize(camelCase(collection.name));

		types += `export type ${collectionName} = {\n`;
		for (const field of collection.fields) {
			if (field.name.toLowerCase() === 'password' || field.type === 'password') continue;
			const optional = !field.required ? '?' : '';
			const type = pbFieldToType(field);
			types += `  ${field.name}${optional}: ${type};\n`;
		}
		types += '};\n\n';
	}

	return types;
}

function pbFieldToType(field: PbField): string {
	switch (field.type) {
		case 'text':
		case 'editor':
		case 'url':
		case 'email':
			return 'string';
		case 'number':
			return 'number';
		case 'bool':
			return 'boolean';
		case 'date':
		case 'autodate':
			return 'Date | string';
		case 'select':
			if (field.options?.values) {
				return field.options.values.map((val: string) => `'${val}'`).join(' | ');
			}
			return 'string';
		case 'json':
			return 'JSON'; // Or a more specific type if you have one
		case 'file':
			if (field.options?.maxSelect && field.options.maxSelect > 1) {
				return 'string[]'; // Assuming filenames are stored as strings
			} else {
				return 'string';
			}
		case 'relation':
			if (field.options?.maxSelect && field.options.maxSelect > 1) {
				return 'string[]'; // Array of related record IDs
			} else {
				return 'string'; // Single related record ID
			}
		default:
			return 'unknown';
	}
}

export async function genERD(pbSchema: string, outputPath: string): Promise<void> {
	try {
		const schemaFileContent = await Deno.readTextFile(shemaFile);
		const pbSchema: PbCollection[] = JSON.parse(schemaFileContent);

		const erd = shemaToERD(pbSchema);

		await Deno.writeTextFile(outputPath, erd);
		console.log(`ERD generated and saved to ${outputPath}`);
	} catch (error) {
		console.error('Error generating ERD:', error);
	}
}

function shemaToERD(pbSchema: PbCollection[]): string {
	let erd = '';
	let relationships = '';

	for (const collection of pbSchema) {
		if (collection.name.startsWith('_')) continue;

		const collectionName = capitalize(camelCase(collection.name));

		erd += `${collectionName} {\n`;

		for (const field of collection.fields) {
			if (field.name.toLowerCase() === 'password' || field.type === 'password') continue;

			const fieldName = field.name;
			const fieldType = pbFieldToERDType(field);
			const primaryKey = field.primaryKey ? ' pk' : '';

			erd += `${fieldName} ${fieldType}${primaryKey}\n`;

			if (field.type === 'relation' && field.collectionId) {
				const relatedCollection = pbSchema.find((c) => c.id === field.collectionId);

				if (relatedCollection) {
					const relatedCollectionName = capitalize(camelCase(relatedCollection.name));
					const relationshipType =
						field.options?.maxSelect && field.options.maxSelect > 1 ? '<>' : '>';

					relationships += `\n${collectionName} ${relationshipType} ${relatedCollectionName}`;
				}
			}
		}
		erd += '}\n\n';
	}
	return erd + relationships;
}

function pbFieldToERDType(field: PbField): string {
	switch (field.type) {
		case 'text':
		case 'editor':
		case 'url':
		case 'email':
		case 'relation':
			return 'string';
		case 'number':
			return 'number';
		case 'bool':
			return 'boolean';
		case 'date':
		case 'autodate':
			return 'date';
		case 'select':
			return 'string'; // You might want to represent enums differently in your ERD
		case 'json':
			return 'json'; // Or a more specific representation if you have one
		case 'file':
			return 'file';
		default:
			return 'unknown';
	}
}

function camelCase(str: string): string {
	return str
		.replace(/_([a-z])/g, function (_, char) {
			return char.toUpperCase();
		})
		.replace(/\s+/g, '');
}

function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

export function genTypesAndERD(schemaFile: string, outputPath: string) {
	const typesFile = `${outputPath}.types.ts`;
	const erdFile = `${outputPath}.erd`;

	schemaToTypes(schemaFile, typesFile);
	genERD(schemaFile, erdFile);
}

*/

export class PokeSchema {
	private pbSchema: PbCollection[];

	constructor(rawSchema: string) {
		this.pbSchema = JSON.parse(rawSchema);
	}

	async generateTypes(): Promise<string> {
		let types = '';
		try {
			types = this.generate(this.pbSchema);
			console.log(`Types generated`);
		} catch (error) {
			console.error('Error generating types:', error);
		}
		return types;
	}

	private generate(pbSchema: PbCollection[]): string {
		let types = '';

		for (const collection of pbSchema) {
			if (collection.name.startsWith('_')) continue;

			const collectionName = this.toCamelCase(collection.name, true);

			types += `export type ${collectionName} = {\n`;
			for (const field of collection.fields) {
				if (this.isIgnoredField(field)) continue;
				const optional = !field.required ? '?' : '';
				const type = this.toTSType(field);
				types += `  ${field.name}${optional}: ${type};\n`;
			}
			types += '};\n\n';
		}

		return types;
	}

	private isIgnoredField(field: PbField): boolean {
		return field.name.toLowerCase() === 'password' || field.type === 'password';
	}

	private toTSType(field: PbField): string {
		switch (field.type) {
			case 'text':
			case 'editor':
			case 'url':
			case 'email':
				return 'string';
			case 'number':
				return 'number';
			case 'bool':
				return 'boolean';
			case 'date':
			case 'autodate':
				return 'Date | string';
			case 'select':
				return field.options?.values
					? field.options.values.map((val: string) => `'${val}'`).join(' | ')
					: 'string';
			case 'json':
				return 'JSON';
			case 'file':
			case 'relation':
				return field.options?.maxSelect && field.options.maxSelect > 1 ? 'string[]' : 'string';
			default:
				return 'unknown';
		}
	}

	private toCamelCase(str: string, capitalizeFirstChar: boolean = false): string {
		const result = str.replace(/_([a-z])/g, (_, char) => char.toUpperCase()).replace(/\s+/g, '');

		return capitalizeFirstChar ? result.charAt(0).toUpperCase() + result.slice(1) : result;
	}
}
