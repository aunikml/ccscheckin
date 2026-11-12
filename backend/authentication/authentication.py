from rest_framework_simplejwt.authentication import JWTAuthentication

class QueryParamOrHeaderJWTAuthentication(JWTAuthentication):
    """
    Extends SimpleJWT's JWTAuthentication to inspect:
    1. Standard 'Authorization: Bearer <token>' header
    2. 'token' or 'jwt' query parameter (for direct file downloads / top-level browser navigation)
    """
    def authenticate(self, request):
        header = self.get_header(request)
        if header is not None:
            raw_token = self.get_raw_token(header)
        else:
            raw_token = request.query_params.get('token') or request.query_params.get('jwt')
            if raw_token is not None:
                raw_token = raw_token.encode('utf-8')

        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token

