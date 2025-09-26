<script lang="ts">
  import type { Doc } from '../../convex/_generated/dataModel';
  import { convertToDisplayFormat } from '$lib/utils/questionType.js';

  let { questions }: { questions: Doc<'question'>[] | undefined } = $props();
</script>

{#if !questions || questions.length === 0}
  <div class="flex items-center justify-center p-8">
    <div class="text-center">
      <div class="text-4xl mb-4">📚</div>
      <h3 class="text-lg font-semibold mb-2 text-base-content">No questions found</h3>
      <p class="text-base-content/70">No questions available for the selected module.</p>
    </div>
  </div>
{:else}
  <div class="space-y-3 sm:space-y-4">
    {#each questions as questionItem, index (questionItem._id)}
      <div
        class="relative rounded-xl bg-base-100 shadow-sm border border-base-300 p-3 sm:p-4 transition-shadow duration-300 hover:shadow-md hover:border-primary/30 active:scale-[0.98] touch-manipulation"
      >
        <div class="flex flex-col gap-3 sm:gap-4">
          <div class="flex items-start justify-between gap-2 sm:gap-3">
            <div class="flex items-start gap-3">
              <div class="flex items-center gap-2">
                <div class="text-xs text-base-content/60 font-mono badge rounded-full" title="Position">
                  {index + 1}
                </div>
              </div>

              <div class="flex flex-col min-w-0 flex-1">
                <h3 class="card-title text-base-content text-left leading-snug line-clamp-2 sm:line-clamp-3 text-sm sm:text-base tiptap-content" title={questionItem.stem}>
                  {@html questionItem.stem}
                </h3>

                <div class="mt-1 flex flex-wrap items-center gap-2">
                  {#if questionItem.type}
                    <div class="badge badge-ghost" title={`Type: ${convertToDisplayFormat(questionItem.type)}`}>
                      {convertToDisplayFormat(questionItem.type)}
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          </div>

          {#if questionItem.options?.length}
            <div class="flex flex-col gap-2 sm:gap-3">
              <div class="rounded-lg border border-base-300 bg-base-200/40 p-2 sm:p-3 flex-1">
                <div class="text-xs font-semibold uppercase tracking-wide text-base-content/60 mb-2">
                  Options
                </div>

                <ul class="bg-transparent p-0 gap-1">
                  {#each questionItem.options as option (option.id)}
                    <li class="rounded-lg">
                      <div class="flex items-center justify-between rounded-lg px-3 py-2 sm:px-2 sm:py-1.5 hover:bg-base-200 active:bg-base-300 transition-colors touch-manipulation min-h-[44px]">
                        <span class="text-sm text-base-content/80 {questionItem.correctAnswers?.includes(option.id) ? 'font-semibold text-success' : ''} leading-relaxed tiptap-content">{@html option.text}</span>
                      </div>
                    </li>
                  {/each}
                </ul>
              </div>
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </div>
{/if}

