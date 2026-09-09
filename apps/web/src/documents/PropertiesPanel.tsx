import { parseProperties } from './properties.ts';

export function PropertiesPanel({ source }: { source: string }) {
  const result = parseProperties(source);
  if (result.status === 'none') return null;

  return (
    <section className="document-properties" aria-labelledby="document-properties-title">
      <h2 id="document-properties-title">Properties</h2>
      {result.status === 'error' ? (
        <p role="alert">{result.message}</p>
      ) : result.properties.length === 0 ? (
        <p className="document-properties-empty">No properties</p>
      ) : (
        <dl>
          {result.properties.map((property) => (
            <div key={property.name}>
              <dt>{property.name}</dt>
              <dd>
                {Array.isArray(property.value) ? (
                  <ul>
                    {property.value.map((value, index) => (
                      <li key={`${String(value)}-${String(index)}`}>{String(value)}</li>
                    ))}
                  </ul>
                ) : (
                  String(property.value)
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
