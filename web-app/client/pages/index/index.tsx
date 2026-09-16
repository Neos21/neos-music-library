import { type ReactElement } from 'react';

import { AuthForm } from './components/auth-form';
import { Library } from './components/library';

/** トップページ */
export default function Index(): ReactElement {
  return (
    <main className="px-2 py-4">
      <h1>Neo's Music Library</h1>
      
      <Library />
      
      <AuthForm />
    </main>
  );
}
