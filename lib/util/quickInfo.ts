import ts from 'typescript';

const displayPartsToString = (
  parts: ts.SymbolDisplayPart[] | undefined,
): string => {
  if (!parts) {
    return '';
  }
  return parts.map((part) => part.text).join('');
};

const makeCodeblock = (content: string): string => {
  if (/^\s*[~`]{3}/m.test(content)) {
    return content;
  }
  return '```ts\n' + content + '\n```';
};

const getTagBodyText = (tag: ts.JSDocTagInfo): string | undefined => {
  if (!tag.text) {
    return undefined;
  }

  const text = displayPartsToString(tag.text);

  switch (tag.name) {
    case 'example': {
      // Check for caption tags
      const captionTagMatches = text.match(
        /<caption>(.*?)<\/caption>\s*(\r\n|\n)/,
      );
      if (captionTagMatches && captionTagMatches.index === 0) {
        return (
          captionTagMatches[1] +
          '\n' +
          makeCodeblock(text.substring(captionTagMatches[0].length))
        );
      }
      return makeCodeblock(text);
    }
    case 'author': {
      // Fix obscured email address
      const emailMatch = text.match(/(.+)\s<([-.\w]+@[-.\w]+)>/);
      if (emailMatch === null) {
        return text;
      }
      return `${emailMatch[1]} ${emailMatch[2]}`;
    }
    case 'default': {
      return makeCodeblock(text);
    }
    default: {
      return text;
    }
  }
};

const getTagDocumentation = (tag: ts.JSDocTagInfo): string | undefined => {
  const text = displayPartsToString(tag.text);

  switch (tag.name) {
    case 'augments':
    case 'extends':
    case 'param':
    case 'template': {
      // Split into param name and description
      const match = text.match(/^(\S+)\s*-?\s*([\s\S]*)/);
      if (match) {
        const [, param, doc] = match;
        const label = `*@${tag.name}* \`${param}\``;
        if (!doc) {
          return label;
        }
        return label + (/\r\n|\n/g.test(doc) ? '  \n' + doc : ` — ${doc}`);
      }
      break;
    }
    case 'return':
    case 'returns': {
      if (!tag.text?.length) {
        return undefined;
      }
      break;
    }
  }

  // Generic tag
  const label = `*@${tag.name}*`;
  const bodyText = getTagBodyText(tag);
  if (!bodyText) {
    return label;
  }
  return (
    label + (/\r\n|\n/g.test(bodyText) ? '  \n' + bodyText : ` — ${bodyText}`)
  );
};

const tagsToMarkdown = (tags: ts.JSDocTagInfo[]) => {
  return tags
    .map((tag) => getTagDocumentation(tag))
    .filter(Boolean)
    .join('  \n\n');
};

export const renderQuickInfo = (quickInfo: ts.QuickInfo) => {
  const parts: string[] = [];

  const displayString = displayPartsToString(quickInfo.displayParts);
  if (displayString) {
    parts.push('```ts\n' + displayString + '\n```');
  }

  const documentation = displayPartsToString(quickInfo.documentation);
  if (documentation) {
    parts.push(documentation);
  }

  if (quickInfo.tags && quickInfo.tags.length > 0) {
    const tagsMarkdown = tagsToMarkdown(quickInfo.tags);
    if (tagsMarkdown) {
      parts.push(tagsMarkdown);
    }
  }

  return parts.join('\n\n');
};
