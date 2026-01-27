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
  <div class="space-y-4">
    {#each questions as questionItem, index (questionItem._id)}
      <div class="group relative rounded-2xl border border-base-200 bg-base-100 p-5 transition-all hover:border-base-300 hover:shadow-sm">
        <div class="flex flex-col gap-4">
          <!-- Header: Index, Stem & Type -->
          <div class="flex items-start gap-3">
            <div class="flex-none pt-0.5">
              <span class="badge badge-sm badge-soft font-mono text-xs opacity-70">
                {index + 1}
              </span>
            </div>

            <div class="flex-1 min-w-0">
               <div class="flex items-start justify-between gap-4">
                  <div class="text-base font-medium leading-tight text-base-content tiptap-content">
                    {@html questionItem.stem}
                  </div>
                   {#if questionItem.type}
                    <span class="badge badge-xs badge-outline text-[10px] uppercase tracking-wider opacity-50 flex-none mt-1">
                      {convertToDisplayFormat(questionItem.type)}
                    </span>
                  {/if}
               </div>
            </div>
          </div>

          <!-- Options Preview -->
          {#if questionItem.options?.length}
            <div class="grid grid-cols-1 gap-2 pl-2 sm:pl-10">
              {#each questionItem.options as option, i (option.id)}
                <div class="flex items-start gap-3 rounded-xl bg-base-200/50 px-4 py-3 text-sm transition-colors hover:bg-base-200">
                  <span class="font-bold text-base-content/60 pt-0.5 select-none font-mono text-xs">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  <div class="flex-1 min-w-0 tiptap-content leading-snug">
                    <span class={questionItem.correctAnswers?.includes(option.id) ? 'font-medium text-success' : 'text-base-content/90'}>
                       {@html option.text}
                    </span>
                  </div>
                  {#if questionItem.correctAnswers?.includes(option.id)}
                    <div class="flex-none text-success" title="Correct Answer">
                       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </div>
{/if}

