export interface FixtureWorkshop {
    id: string;
    pin: string;
}

export async function createFixtureWorkshop(apiUrl: string, token: string): Promise<FixtureWorkshop> {
    const res = await fetch(`${apiUrl}/api/workshops/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            title: `E2E Fixture Workshop ${Date.now()}`,
            config: {
                criteria: [
                    { name: 'Feasibility', weight: 50 },
                    { name: 'Business Value', weight: 50 },
                ],
                template_id: null,
            },
        }),
    });

    if (!res.ok) {
        throw new Error(`Failed to create fixture workshop: ${res.status} ${await res.text()}`);
    }

    return res.json();
}
