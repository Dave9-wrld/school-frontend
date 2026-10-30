'use client';
import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import type { Session } from '@/lib/types';
import { Dialog, Notice, Submit } from './ui';

export function CreateAccountDialog({session,role,onClose,onCreated}:{session:Session;role:'STUDENT'|'TEACHER';onClose:()=>void;onCreated:()=>void}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const teacher=role==='TEACHER';
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError('');
    const fields=Object.fromEntries(new FormData(event.currentTarget));
    try{
      if(fields.password!==fields.confirm_password) throw new Error('The passwords do not match.');
      delete fields.confirm_password;
      await api('admin/users/',session,{method:'POST',body:JSON.stringify({...fields,role})});
      onCreated();
    }catch(error){setError(error instanceof Error?error.message:'Please try again.');}
    finally{setBusy(false);}
  }
  return <Dialog title={teacher?'Add a lecturer':'Add a student'} onClose={()=>{if(!busy)onClose();}}>
    <Notice>{error}</Notice><form onSubmit={submit}>
      <div className="form-row"><label>First name<input name="first_name" autoComplete="off" maxLength={150} required/></label><label>Last name<input name="last_name" autoComplete="off" maxLength={150} required/></label></div>
      <label>Username<input name="username" autoComplete="off" maxLength={150} required/></label>
      <label>Email address<input name="email" type="email" autoComplete="off" required/></label>
      <label>{teacher?'Employee ID':'Admission number'} (optional)<input name={teacher?'employee_id':'admission_number'} maxLength={20} placeholder={teacher?'e.g. STAFF-026':'e.g. DU/26/001'}/></label>
      <label>Password<input name="password" type="password" autoComplete="new-password" minLength={8} required/></label>
      <label>Confirm password<input name="confirm_password" type="password" autoComplete="new-password" minLength={8} required/></label>
      <p className="form-footnote">The account holder signs in through the same portal. Share their credentials privately.</p>
      <Submit busy={busy}>Create {teacher?'lecturer':'student'} account</Submit>
    </form>
  </Dialog>;
}
