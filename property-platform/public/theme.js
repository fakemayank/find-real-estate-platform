(()=> {
    const key='find-color-mode'; let mode; try {
        mode=localStorage.getItem(key)
    }
    catch {
    }
    if(mode!=='dark'&&mode!=='light')mode='light'; const set=m=> {
        document.documentElement.dataset.theme=m; const b=document.getElementById('themeSwitch'); if(b) {
            b.setAttribute('aria-checked',String(m==='dark')); b.setAttribute('aria-label',m==='dark'?'Switch to light mode':'Switch to dark mode')
        }
        try {
            localStorage.setItem(key,m)
        }
        catch {
        }
    }
    ; set(mode); document.addEventListener('DOMContentLoaded',()=> {
        set(mode); document.getElementById('themeSwitch')?.addEventListener('click',()=> {
            mode=document.documentElement.dataset.theme==='dark'?'light':'dark'; set(mode)
        }
        )
    }
    );
}
)();
