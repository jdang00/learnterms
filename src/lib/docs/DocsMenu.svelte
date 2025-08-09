<script lang="ts">
  import { page } from '$app/stores'
  import { docsNav } from './nav'

  const currentPath = $derived($page.url.pathname)

  function isActive(path: string) {
    return currentPath === path
  }
</script>

<aside class="">
  <ul class="menu bg-base-200 rounded-box p-3 w-56">
    {#each docsNav as section}
      <li class="menu-title text-xs uppercase opacity-70">{section.title}</li>
      {#each section.items as item}
        <li>
          <a href={item.path} class:active={isActive(item.path)}>{item.title}</a>
        </li>
      {/each}
    {/each}
  </ul>
</aside>


