# Working Plan

## Purpose

This file records the user's explicit constraints for the knowledge-base rewrite so future work does not drift.

## Agreed Direction

- The output must be a real knowledge base, not a pile of summaries, guidance pages, or author-facing explanations.
- The content must be organized as a coherent system, not as scattered topic notes.
- Each chapter should live in its own directory, and each subtopic should be a separate Markdown file.

## Allowed Mainline Structures

Future rewrites should follow one of these two primary organizing strategies:

1. Use game development history as the mainline.
2. Use game types and the technologies they require as the mainline.

Do not invent a third mainline structure without explicit user approval.

## Explicit Anti-Patterns

The following are considered wrong for the public-facing book unless the user explicitly asks for them:

- "How to read this book" style front-matter
- "Terminology agreement" style front-matter
- "Restructure plan" or "chapter audit" pages inside the book
- Author voice that teaches or lectures the reader
- Empty overview prose that mainly restates section titles

These materials may exist only as internal notes outside `src/`.

## Writing Standard

Each article should aim to explain:

- what problem exists
- why the problem exists
- which kinds of games or project stages trigger it
- what technical options exist
- what each option costs
- what common mistakes teams make

If a page mainly repeats headings in prose, it is not acceptable.

## Process Rule

- Keep plan and constraint notes in Markdown under `internal-notes/`.
- Before any major structural rewrite, update these notes first.
- Do not rely on conversation memory alone for future direction.
