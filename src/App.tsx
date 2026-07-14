import { useState, useEffect } from 'react';
import { fetchMatch, type MatchResult, type MatchResultItem } from './lib/matchClient';
import { findByCode, intentKeywords } from './data/loadDB';
import './index.css';

const EXAMPLES = [
  "사용자가 가까이 다가와 손을 흔들며 밝게 인사할 때, 푸코가 반갑게 맞이한다",
  "사용자가 먼 거리에서 멍하게 서 있을 때, 푸코가 주의를 끄는 행동을 한다",
  "사용자가 투사면을 손가락으로 가리키며 찡그릴 때, 푸코가 화면을 조정해준다",
  "사용자가 뒤돌아 걸어갈 때, 푸코가 조용히 대기 모드로 전환한다"
];

// Custom hook for debouncing input
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function CategorySubCard({ item, type }: { item: MatchResultItem, type: string }) {
  const dbItem = findByCode(type as any, item.code);
  return (
    <div className="sub-card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>{dbItem?.category || type}</span>
        <span className="code-tag">{item.code}</span>
      </div>
      <strong style={{ fontSize: '1.05rem', marginBottom: '8px', color: 'var(--text-main)' }}>{dbItem?.name || '알 수 없는 항목'}</strong>
      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.5, flex: 1 }}>
        {dbItem?.desc}
      </p>
      <div style={{ background: '#EAEAEF', padding: '12px 14px', borderRadius: '10px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <strong style={{ color: 'var(--text-main)' }}>매칭 이유 :</strong> {item.reason}
      </div>
    </div>
  );
}

function CategoryWhiteCardList({ title, type, items }: { title: string, type: string, items: MatchResultItem[] }) {
  if (!items || items.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)' }}>{title}</span>
        <div className="card fade-in" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', border: '2px dashed var(--border)', background: 'transparent', boxShadow: 'none' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>이 상황에서는 필요하지 않아요 😌</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {items.map((item, idx) => {
        const dbItem = findByCode(type as any, item.code);
        return (
          <div key={idx} className="card fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', animationDelay: `${idx * 0.1}s` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)' }}>{title}</span>
              <span className="code-tag">{item.code}</span>
            </div>
            <strong style={{ fontSize: '1.35rem', marginBottom: '14px', lineHeight: 1.35, color: 'var(--text-main)' }}>{dbItem?.name || '알 수 없는 항목'}</strong>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '28px', lineHeight: 1.6, flex: 1 }}>
              {dbItem?.desc}
            </p>
            <div style={{ background: 'var(--bg)', padding: '14px 16px', borderRadius: '12px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--text-main)' }}>매칭 이유 :</strong> {item.reason}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CheckItem({ isValid, label }: { isValid: boolean, label: string }) {
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '8px', 
      fontSize: '0.85rem', 
      color: isValid ? '#10B981' : 'var(--text-muted)',
      transition: 'color 150ms ease-in-out'
    }}>
      <div style={{
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        border: isValid ? '2px solid #10B981' : '2px solid var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 150ms ease-in-out',
        background: isValid ? '#10B981' : 'transparent'
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isValid ? 'white' : 'transparent'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'stroke 150ms ease-in-out' }}>
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <span style={{ fontWeight: isValid ? 600 : 400, transition: 'font-weight 150ms ease-in-out' }}>{label}</span>
    </div>
  );
}

function App() {
  const [scenario, setScenario] = useState('');
  const debouncedScenario = useDebounce(scenario, 200);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingTime, setLoadingTime] = useState(0);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState('');

  // Validation Logic based on the debounced string
  const hasTrigger = /할\s*때|하면|했을\s*때|한\s*순간|사용자가/.test(debouncedScenario);
  const hasMinLength = debouncedScenario.trim().length >= 12;
  const hasSubject = /푸코가|푸코는/.test(debouncedScenario);
  const hasIntent = intentKeywords.some(kw => debouncedScenario.includes(kw));

  const isFormValid = hasTrigger && hasMinLength;
  const missingRecommendedCount = (!hasSubject ? 1 : 0) + (!hasIntent ? 1 : 0);

  useEffect(() => {
    let timer: any;
    if (isLoading) {
      timer = setInterval(() => {
        setLoadingTime(prev => prev + 1);
      }, 1000);
    } else {
      setLoadingTime(0);
    }
    return () => clearInterval(timer);
  }, [isLoading]);

  const handleMatch = async () => {
    if (!isFormValid) return;
    setIsLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await fetchMatch(scenario);
      setResult(data);
    } catch (err: any) {
      setError(err.message || '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <header style={{ width: '100%', maxWidth: '1080px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
          PUCO Grammar Console
        </h1>
      </header>

      <main style={{ width: '100%', maxWidth: '1080px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <section className="card fade-in">
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 20px 0' }}>시나리오 입력</h2>
          <textarea 
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            placeholder="사용자가 [트리거]했을 때, 푸코가 [의도·감정]을 전달한다"
            style={{ width: '100%', height: '140px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '16px', color: 'var(--text-main)', padding: '20px', fontSize: '1.1rem', resize: 'none', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s', marginBottom: '16px' }}
          />
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', background: '#F8F8F9', padding: '16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.03)' }}>
            <CheckItem isValid={hasTrigger} label="트리거 포함 (필수)" />
            <CheckItem isValid={hasMinLength} label="최소 12자 이상 (필수)" />
            <div style={{ width: '1px', background: 'var(--border)', margin: '0 4px' }} />
            <CheckItem isValid={hasSubject} label="푸코 명시 (권장)" />
            <CheckItem isValid={hasIntent} label="의도/감정 표현 포함 (권장)" />
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px' }}>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {EXAMPLES.map((ex, idx) => (
                  <button key={idx} className="chip" onClick={() => setScenario(ex)}>
                    {ex}
                  </button>
                ))}
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {missingRecommendedCount > 0 && isFormValid && (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  권장 항목 {missingRecommendedCount}개 미충족
                </span>
              )}
              <button 
                onClick={handleMatch}
                disabled={isLoading || !isFormValid}
                style={{ padding: '14px 40px', background: isLoading || !isFormValid ? '#D1D1D6' : 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-pill)', fontSize: '1.05rem', fontWeight: 600, cursor: isLoading || !isFormValid ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
              >
                {isLoading ? (
                  <>
                    <svg className="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    {loadingTime > 5 ? '형식을 맞추는 중...' : '실행 중'}
                  </>
                ) : '매칭 실행'}
              </button>
            </div>
          </div>
        </section>

        {error && (
          <div className="card fade-in" style={{ borderLeft: '4px solid #EF4444', color: '#B91C1C', padding: '20px' }}>
            <strong>오류: </strong>{error}
          </div>
        )}

        {result && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {result.missingIntent && (
              <section className="card" style={{ border: '1px solid #F59E0B', background: '#FEF3C7' }}>
                <h3 style={{ fontSize: '1rem', color: '#B45309', margin: '0 0 8px 0' }}>⚠️ 의도 또는 상황 불분명</h3>
                <p style={{ fontSize: '0.95rem', color: '#92400E', margin: 0, lineHeight: 1.5 }}>{result.intentNote}</p>
              </section>
            )}

            <section className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '0.95rem', color: 'var(--primary)', margin: 0, fontWeight: 700 }}>전체 시나리오 요약</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ 
                    padding: '4px 14px', 
                    borderRadius: '9999px', 
                    fontSize: '0.8rem', 
                    fontWeight: 600,
                    transition: 'all 0.2s',
                    border: result.sensorGroups?.tof ? '1px solid var(--primary)' : '1px solid var(--border)',
                    background: result.sensorGroups?.tof ? 'var(--primary)' : 'transparent',
                    color: result.sensorGroups?.tof ? 'white' : 'var(--text-muted)'
                  }}>ToF</span>
                  <span style={{ 
                    padding: '4px 14px', 
                    borderRadius: '9999px', 
                    fontSize: '0.8rem', 
                    fontWeight: 600,
                    transition: 'all 0.2s',
                    border: result.sensorGroups?.camera ? '1px solid var(--primary)' : '1px solid var(--border)',
                    background: result.sensorGroups?.camera ? 'var(--primary)' : 'transparent',
                    color: result.sensorGroups?.camera ? 'white' : 'var(--text-muted)'
                  }}>RGB 카메라</span>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.5 }}>{result.summary}</p>
            </section>

            <section className="card">
              <h2 style={{ fontSize: '0.95rem', color: 'var(--primary)', margin: '0 0 20px 0', fontWeight: 700 }}>센서 역할</h2>
              {(!result.SN || result.SN.length === 0) ? (
                 <div style={{ padding: '24px', border: '2px dashed var(--border)', borderRadius: '12px', textAlign: 'center' }}>
                   <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>이 상황에서는 센서 감지가 필요하지 않아요 😌</p>
                 </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                  {result.SN.map((item, idx) => (
                    <CategorySubCard key={idx} item={item} type="SN" />
                  ))}
                </div>
              )}
            </section>

            {result.activationSummary && (
              <div style={{ padding: '0 8px', marginTop: '8px' }}>
                <p style={{ fontSize: '0.95rem', color: 'var(--primary)', margin: 0, fontWeight: 700 }}>
                  💡 {result.activationSummary}
                </p>
              </div>
            )}
            
            <div className="reaction-grid">
              <CategoryWhiteCardList title="모션" type="MP" items={result.MP} />
              <CategoryWhiteCardList title="프로젝션" type="PJ" items={result.PJ} />
              <CategoryWhiteCardList title="스피커" type="SP" items={result.SP} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
