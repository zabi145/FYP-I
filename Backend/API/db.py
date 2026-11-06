import pyodbc

def get_db_connection():

    return pyodbc.connect(
        "DRIVER={ODBC Driver 18 for SQL Server};"
        "SERVER=.\SQLEXPRESS;"
        "DATABASE=BIITFlipVideosEvaluator;"
        "Trusted_Connection=yes;"
        "TrustServerCertificate=yes;"
    )