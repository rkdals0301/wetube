import routes from "./routes";

export const localsMiddleware = (rqe, res, next) => {
    res.locals.siteName = "WeTube";
    res.locals.routes = routes;
    res.locals.user = {
        isAuthenticated: true,
        id: 5
    };
    next();
};