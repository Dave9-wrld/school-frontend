import { Button } from './ui/button';
import { ArrowUpRight, BookOpen, CheckCircle2, GraduationCap, LoaderCircle, X, AlertCircle } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

export function Brand({light = false, compact = false}: {light?:boolean;compact?:boolean}) {
  return <div className={`brand ${light ? 'brand-light' : ''}`}><span className="brand-seal"><GraduationCap size={24}/><span className="seal-line"/></span><span className="wordmark">dave<span>UNIVERSITY</span></span>{!compact && <span className="brand-divider"/>}{!compact && <span className="brand-caption">Academic<br/>portal</span>}</div>;
}
export function Notice({children,success=false}: {children:ReactNode;success?:boolean}) {
  if (!children) return null;
  return <div className={`notice ${success ? 'notice-success' : ''}`} role={success ? 'status' : 'alert'}>{success ? <CheckCircle2 size={17}/> : <AlertCircle size={17}/>}<span>{children}</span></div>;
}
export function Submit({children,busy=false,disabled=false}: {children:ReactNode;busy?:boolean;disabled?:boolean}) {
  return <Button type="submit" size="lg" className="button button-primary" aria-busy={busy} disabled={busy || disabled}>{busy ? <><LoaderCircle className="spin" size={17}/> Please wait…</> : children}{!busy && <ArrowUpRight size={18}/>}</Button>;
}
export function Empty({title,children}: {title:string;children:ReactNode}) {
  return <div className="empty"><span><BookOpen size={25}/></span><h3>{title}</h3><div className="empty-detail">{children}</div></div>;
}
export function PanelHeading({eyebrow,title,action}: {eyebrow?:string;title:string;action?:ReactNode}) {
  return <div className="panel-heading"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2></div>{action}</div>;
}
export function Dialog({title,onClose,children}: {title:string;onClose:()=>void;children:ReactNode}) {
  const ref = useRef<HTMLElement>(null);
  const close = useRef(onClose);close.current=onClose;
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null;
    const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
    (ref.current?.querySelector('input,select,textarea') as HTMLElement|null)?.focus();
    function handleKey(event:KeyboardEvent){
      if(event.key==='Escape'){event.preventDefault();close.current();}
      if(event.key==='Tab'){
        const elements=Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]') || []);
        const first=elements[0],last=elements.at(-1);
        if(event.shiftKey && document.activeElement===first){event.preventDefault();last?.focus();}
        else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first?.focus();}
      }
    }
    document.addEventListener('keydown',handleKey);
    return()=>{document.removeEventListener('keydown',handleKey);document.body.style.overflow=overflow;previous?.focus();};
  },[]);
  return <div className="dialog-backdrop" onClick={e => {if(e.target === e.currentTarget) onClose();}}><section ref={ref} className="dialog" role="dialog" aria-modal="true" aria-label={title}><header><div><span className="eyebrow">Academic administration</span><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={20}/></button></header>{children}</section></div>;
}
