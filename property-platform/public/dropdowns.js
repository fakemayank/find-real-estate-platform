/* Enhance every native select without changing its name, value, form or change events. */
(()=> {
    'use strict'; const enhanced=new WeakSet(); let opened=null; function close() {
        if(!opened)return; opened.classList.remove('open'); const panel=opened.querySelector('.find-select-panel'); if(panel)panel.hidden=true; opened.querySelector('.find-select-trigger')?.setAttribute('aria-expanded','false'); opened=null
    }
    function enhance(select) {
        if(enhanced.has(select)||select.multiple||select.size>1||select.closest('.find-select'))return; enhanced.add(select); const wrap=document.createElement('div'); wrap.className='find-select'; select.parentNode.insertBefore(wrap,select); wrap.appendChild(select); const trigger=document.createElement('button'); trigger.type='button'; trigger.className='find-select-trigger'; trigger.setAttribute('aria-haspopup','listbox'); trigger.setAttribute('aria-expanded','false'); const value=document.createElement('span'),chevron=document.createElement('i'); chevron.className='fa-solid fa-chevron-down'; chevron.setAttribute('aria-hidden','true'); trigger.append(value,chevron); const panel=document.createElement('div'); panel.className='find-select-panel'; panel.setAttribute('role','listbox'); panel.hidden=true; wrap.append(trigger,panel); function sync() {
            const opt=select.selectedOptions[0]; value.textContent=opt?.textContent?.trim()||'Select an option'; trigger.disabled=select.disabled; trigger.setAttribute('aria-label',select.getAttribute('aria-label')||opt?.textContent?.trim()||'Choose an option');
        }
        function build() {
            panel.replaceChildren(); Array.from(select.options).forEach((opt,index)=> {
                const item=document.createElement('button'); item.type='button'; item.className='find-select-option'; item.setAttribute('role','option'); item.setAttribute('aria-selected',String(index===select.selectedIndex)); item.disabled=opt.disabled; const label=document.createElement('span'); label.textContent=opt.textContent; item.append(label); if(index===select.selectedIndex) {
                    const check=document.createElement('i'); check.className='fa-solid fa-check'; check.setAttribute('aria-hidden','true'); item.append(check)
                }
                item.addEventListener('click',()=> {
                    select.selectedIndex=index; select.dispatchEvent(new Event('input', {
                        bubbles:true
                    }
                    )); select.dispatchEvent(new Event('change', {
                        bubbles:true
                    }
                    )); sync(); close(); trigger.focus()
                }
                ); panel.append(item)
            }
            )
        }
        trigger.addEventListener('click',()=> {
            if(opened===wrap) {
                close(); return
            }
            close(); sync(); build(); panel.hidden=false; wrap.classList.add('open'); trigger.setAttribute('aria-expanded','true'); opened=wrap
        }
        ); trigger.addEventListener('keydown',e=> {
            if(['ArrowDown','ArrowUp','Enter',' '].includes(e.key)) {
                e.preventDefault(); if(opened!==wrap)trigger.click(); const items=[...panel.querySelectorAll('.find-select-option:not(:disabled)')]; (e.key==='ArrowUp'?items[items.length-1]:items[0])?.focus()
            }
        }
        ); panel.addEventListener('keydown',e=> {
            const items=[...panel.querySelectorAll('.find-select-option:not(:disabled)')]; const idx=items.indexOf(document.activeElement); if(e.key==='Escape') {
                e.preventDefault(); close(); trigger.focus()
            }
            else if(e.key==='ArrowDown'||e.key==='ArrowUp') {
                e.preventDefault(); items[(idx+(e.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus()
            }
            else if(e.key==='Home') {
                e.preventDefault(); items[0]?.focus()
            }
            else if(e.key==='End') {
                e.preventDefault(); items[items.length-1]?.focus()
            }
        }
        ); select.addEventListener('change',sync); select.addEventListener('input',sync); sync();
    }
    function scan(root) {
        if(root.nodeType!==1&&root.nodeType!==9)return; if(root.matches?.('select'))enhance(root); root.querySelectorAll?.('select').forEach(enhance)
    }
    document.addEventListener('click',e=> {
        if(opened&&!opened.contains(e.target))close()
    }
    ); document.addEventListener('keydown',e=> {
        if(e.key==='Escape')close()
    }
    ); document.addEventListener('DOMContentLoaded',()=> {
        scan(document); new MutationObserver(records=> {
            for(const record of records) {
                for(const node of record.addedNodes) {
                    if(node.nodeType===1)scan(node)
                }
            }
            if(opened&&!opened.isConnected)opened=null
        }
        ).observe(document.body, {
            childList:true,subtree:true
        }
        )
    }
    );
}
)();
