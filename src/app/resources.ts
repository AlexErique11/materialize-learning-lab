export interface DocumentationLink {
  readonly title: string;
  readonly href: string;
}

export const DOCUMENTATION_URL = 'https://materialize.com/docs/';

export const materializeDocumentation: DocumentationLink = {
  title: 'Materialize documentation',
  href: DOCUMENTATION_URL,
};
