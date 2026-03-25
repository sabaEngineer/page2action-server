import { IsIn } from 'class-validator';

const AI_EDIT_ACTIONS = [
  'make_longer',
  'improve_writing',
  'make_shorter',
  'fix_grammar',
] as const;

export class AiEditInsightDto {
  @IsIn(AI_EDIT_ACTIONS)
  action: (typeof AI_EDIT_ACTIONS)[number];
}
