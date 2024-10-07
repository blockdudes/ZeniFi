export const GET = async (request) => {
    try {
        const user = [
            "archway1ex4xt0xkhsule6gk8xf057eklw9s5zl44c7c5h"
        ]

        return Response.json(user);
    } catch (error) {
        return Response.error({ error }, { status: 500 })
    }
}